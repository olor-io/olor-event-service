var _ = require('lodash');
var Joi = require('joi');
var changeCase = require('change-case');
var CONST = require('../constants');
var redis = require('../redis').connect();
var knex = require('../database').connect().knex;
var logger = require('../logger')(__filename);
var BASE_SCHEMA = require('../models/model-utils').BASE_SCHEMA;

var HOUR = 60 * 60;
var EXPIRE_SECONDS = Number(process.env.REDIS_EXPIRE_SECONDS || HOUR);

// Wrapper function to make a function use redis as a cache.
// This is possible with a few limitiations:
// * All `func` parameters should be possible to be used as part of redis key.
function redisCache(prefix, func) {
    return function cacheFuncWrapper() {
        var args = Array.prototype.slice.call(arguments);
        var keyComponents = [prefix].concat(args);
        var key = formatRedisKey.apply(this, keyComponents);

        return redis.get(key)
        .then(function(cachedValue) {
            if (cachedValue) {
                // Fail safe cache parsing.
                // If cached value is somehow broken, calculate the value
                // again.
                var obj = null;
                try {
                    obj = JSON.parse(cachedValue);
                } catch (err) {
                    logger.error('Error when parsing redis cached value:');
                    logger.error('key: ' + key);
                    logger.error('value: ' + cachedValue);
                    logger.error(err);
                }

                if (obj) {
                    return obj;
                }
            }

            logger.info('Calculating redis cache, key: ' + key);
            // Pass arguments passed to `cacheFuncWrapper`
            return func.apply(this, args)
            .then(function(calculatedValue) {
                redis
                .multi()
                .set(key, JSON.stringify(calculatedValue))
                .expire(key, EXPIRE_SECONDS)
                .exec()
                .catch(function(err) {
                    logger.error('Error when saving to redis');
                    logger.error('key: ' + key);
                    logger.error(err);
                    throw err;
                });

                return calculatedValue;
            })
            .catch(function(err) {
                throw err;
            });
        });
    };
}

function deleteFromRedis() {
    if (process.env.DISABLE_REDIS === 'true') {
        // Return promise which tells "everything went ok."
        // even though we don't have redis running at all
        return Promise.resolve(true);
    }
    var key = formatRedisKey.apply(this, arguments);

    logger.info('Delete cache (if it exists), key: ' + key);
    return redis.del(key)
    .catch(function(err) {
        logger.error('Error when deleting key from redis');
        logger.error('key: ' + key);
        logger.error(err);
        throw err;
    });
}

function formatRedisKey() {
    var args = Array.prototype.slice.call(arguments);
    return args.join(':');
}

function removeLineBreaks(text) {
    return text.replace(/(\r\n|\n|\r)/gm, '');
}

function removeCommentLineBreaks(rating) {
    if (rating.comment) {
        // Remove line breaks from the comment
        return _.merge({}, rating, {
            comment: removeLineBreaks(rating.comment)
        });
    }

    return rating;
}

// Like _.extend, but undefined values in obj2 will be removed before extend.
function extendOmitUndefined(obj1, obj2) {
    return _.extend(obj1, _.omit(obj2, _.isUndefined));
}

// Pick values of obj in the order specified in keys array
function pickValuesInOrder(obj, keys) {
    return _.map(keys, function(key) {
        if (_.isUndefined(obj[key])) {
            return null;
        }

        return obj[key];
    });
}

function validate(val, name, joiObj) {
    var value = {};
    value[name] = val;

    var schema = {};
    schema[name] = joiObj;

    Joi.validate(value, schema, function(err) {
        if (err) {
            err.name = 'ValidationError';
            throw err;
        }
    });
}

function validateSorts(sorts, allowedKeys) {
    validate(sorts, 'sort', Joi.array().required());

    _.each(sorts, function(val, i) {
        var index = ', sort rule: ' + i;
        validate(val[0], val[0] + index, Joi.string().only(allowedKeys).required());
        validate(val[1], val[1] + index, Joi.string().only(['asc', 'desc']).optional());
    });
}

function validateOffset(offset) {
    validate(offset, 'offset', Joi.number().integer().min(0).required());
}

function validateLimit(limit) {
    validate(limit, 'limit', Joi.number().integer().min(1).max(100).required());
}

function validateBoolean(val, name) {
    if (!_.isUndefined(val)) {
        validate(val, name, Joi.boolean());
    }
}

// Takes obj containing some keys which are allowed to use in where query
// Take those keys, validate their values so that they match the given
// Model's field validation.
// Throws parameter error if validation does not pass, otherwise
// returns the where query object, e.g.
// {targetNamespace: 'a', targetId: ['a', 'b']}
// If allowedKeys is not defined, all keys are accepted
// `publicToModel` can be an object which defined which attributes belong to
// which models. It can also be a single model which will be used with all keys
function pickAndValidateWheres(obj, publicToModel, allowedKeys) {
    // Pick all keys which are allowed in the query
    var whereObj = _.pickBy(obj, function(val, key) {
        logger.info('does this work inside here? ' + 'key: ' + key + ', val: ' + val);
        var isAllowed = _.isArray(allowedKeys)
            ? _.includes(allowedKeys, key)
            : true;
        return isAllowed && !_.isUndefined(val);
    });

    logger.info('WhereValidation (obj): ' + JSON.stringify(obj));
    logger.info('WhereValidation (whereObj): ' + JSON.stringify(whereObj));

    // Validate all values used in the where query
    _.each(whereObj, function(val, whereKey) {
        var Model;
        var modelAttribute;
        if (!_.isPlainObject(publicToModel)) {
            Model = publicToModel
            modelAttribute = whereKey;
        } else {
            Model = publicToModel[whereKey].model;
            modelAttribute = publicToModel[whereKey].attribute;
        }

        var attributeSchema = Model.prototype.schema[modelAttribute];
        if (!attributeSchema)
            attributeSchema = BASE_SCHEMA[modelAttribute];

        var joiValidate = attributeSchema.optional();
        if (_.isArray(val)) {
            _.each(val, function(item) {
                validate(item, whereKey, joiValidate);
            });
        } else {
            validate(val, whereKey, joiValidate);
        }
    });

    return whereObj;
}

function pickAndValidateListOpts(obj, allowedSortKeys, serviceDefaults) {
    logger.info('ListOptsValidation (obj): ' + JSON.stringify(obj));
    logger.info('ListOptsValidation (serviceDefaults): ' + JSON.stringify(serviceDefaults));

    var opts = extendOmitUndefined({
        // These are the internal defaults, services can have their own
        // defaults which will override these defaults
        limit: CONST.DEFAULT_ITEM_LIMIT,
        offset: 0,
        sort: [['updatedAt', 'asc']]
    }, serviceDefaults);

    logger.info('ListOptsValidation (opts): ' + JSON.stringify(opts));
    opts = extendOmitUndefined(opts, _.pick(obj, ['limit', 'offset', 'sort']));

    validateLimit(opts.limit);
    validateOffset(opts.offset);
    validateSorts(opts.sort, allowedSortKeys);

    return opts;
}

// Add array of sorts to knex query builder object
// sorts is e.g. [['updatedAt', 'desc'], ['rating']]
// Modifies query object in place
function addSortsToQuery(query, sorts, publicToModel) {
    _.each(sorts, function(sortCriteria) {
        var columnSortOrder = 'ASC';
        if (sortCriteria.length > 1) {
            columnSortOrder = sortCriteria[1].toUpperCase();
        }

        var sortColumn = _publicToColumn(sortCriteria[0], publicToModel);
        query = query.orderBy(sortColumn, columnSortOrder);
    });

    return query;
}

// Add where queries to knex query builder object
// wheres is e.g. {targetNamespace: 'recipe', targetId: ['a', 'b']}
// the example would translate to
// WHERE target_namespace = 'recipe' AND target_id IN ('a', 'b');
// Modifies query object in place
function addWheresToQuery(query, wheres, publicToModel) {
    _.each(wheres, function(value, modelAttr) {
        var column = modelAttr;
        if (publicToModel) {
            column = _publicToColumn(modelAttr, publicToModel);
        }

        if (_.isArray(value)) {
            query = query.andWhere(column, 'in', value);
        } else {
            query = query.andWhere(column, value);
        }
    });

    return query;
}

// Same as `addWheresToQuery` but uses whereNot operation
function addWhereNotsToQuery(query, whereNots, publicToModel) {
    _.each(whereNots, function(value, modelAttr) {
        var column = modelAttr;
        if (publicToModel) {
            column = _publicToColumn(modelAttr, publicToModel);
        }

        if (_.isArray(value)) {
            query = query.andWhere(column, 'not in', value);
        } else {
            query = query.andWhereNot(column, value);
        }
    });

    return query;
}

// Takes a query and returns a new query which returns the total count of
// rows which the first query returns.
function countQuery(query, opts) {
    opts = opts || {};

    var newQuery = query.clone();

    var queryBuilder;
    if (opts.trx) {
        queryBuilder = opts.trx;
    } else {
        queryBuilder = knex;
    }

    return queryBuilder
    .select()
    .count()
    .from(
        knex.raw('(' + newQuery.toString() + ') as count')
    );
}

function _publicToColumn(publicAttribute, publicToModel) {
    var Model = publicToModel[publicAttribute].model;
    if (!Model) {
        return changeCase.snakeCase(publicAttribute);
    }

    var tableName = Model.prototype.tableName;
    var modelAttribute = publicToModel[publicAttribute].attribute

    return tableName + '.' + changeCase.snakeCase(modelAttribute);
}

module.exports = {
    redisCache: redisCache,
    deleteFromRedis: deleteFromRedis,
    formatRedisKey: formatRedisKey,
    removeLineBreaks: removeLineBreaks,
    removeCommentLineBreaks: removeCommentLineBreaks,
    extendOmitUndefined: extendOmitUndefined,
    pickValuesInOrder: pickValuesInOrder,
    validate: validate,
    validateSorts: validateSorts,
    validateOffset: validateOffset,
    validateLimit: validateLimit,
    validateBoolean: validateBoolean,
    pickAndValidateWheres: pickAndValidateWheres,
    pickAndValidateListOpts: pickAndValidateListOpts,
    addSortsToQuery: addSortsToQuery,
    addWheresToQuery: addWheresToQuery,
    addWhereNotsToQuery: addWhereNotsToQuery,
    countQuery: countQuery
};
