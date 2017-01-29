// Service to handle all operations related to ratings
// Terminology:
// - target: any object which might be the target of a rating. For example
//           a apple-pie recipe is one target
// - rating: numeric rating, comment, or both given to a `target`
//           rating always has an author
// - author: the person who has created a rating
//
// The API exposes only the concept of a rating, to make the API usage easier
// Internally we separate the rating to the target and actual rating.
// When a target is rated for the first time, it is created dynamically
// to the targets table.
// When a rating is updated, the target is also dynamically updated
// This ensures that we have the information of targets only in one place,
// not duplicated to each rating row.

var Promise = require('bluebird');
var _ = require('lodash');
var Rating = require('../models/rating-model');
var Target = require('../models/target-model');
var modelUtils = require('../models/model-utils');
var CONST = require('../constants');
var targetService = require('./target-service');
var settingService = require('./setting-service');
var serviceUtils = require('./service-utils');
var logger = require('../logger')(__filename);
var validate = serviceUtils.validate;
var db = require('../database').connect();
var knex = db.knex;
var bookshelf = db.bookshelf;

// Maps public API attributes to internal
// database objects
var PUBLIC_TO_MODEL = {
    targetId: {model: Target, attribute: 'externalId'},
    targetNamespace: {model: Target, attribute: 'namespace'},
    category: {model: Target, attribute: 'category'},
    subCategory: {model: Target, attribute: 'subCategory'},
    authorId: {model: Rating, attribute: 'authorId'},
    authorRole: {model: Rating, attribute: 'authorRole'},
    createdAt: {model: Rating, attribute: 'createdAt'},
    updatedAt: {model: Rating, attribute: 'updatedAt'},
    rating: {model: Rating, attribute: 'rating'},
    moderated: {model: Rating, attribute: 'moderated'},
    published: {model: Rating, attribute: 'published'},
    replyRequested: {model: Rating, attribute: 'replyRequested'}
};

// Based on these columns, ratings can be searched so that
// the value is single value or array of values.
// E.g. array of categories or single category as a string.
var ALLOWED_MULTI_SEARCH_KEYS = [
    'targetNamespace',
    'targetId',
    'authorId',
    'authorRole',
    'category',
    'subCategory',
    'moderated',
    'published',
    'replyRequested'
];

// These should correspond to indexes in database
// If you add new sortable columns, check indexes in database
var ALLOWED_SORT_KEYS = [
    'targetId',
    'targetNamespace',
    'category',
    'subCategory',
    'createdAt',
    'updatedAt',
    'rating'
];

// Fields which will be only returned for service users, others are considered
// as moderator fields. Use whitelist instead of blacklist
var SERVICE_USER_KEYS = [
    'id',
    'createdAt',
    'updatedAt',
    'targetId',
    'targetNamespace',
    'rating',
    'comment',
    'category',
    'subCategory',
    'authorId',
    'authorName',
    'authorRole',
    'replyRequested'
];

var RATINGS_TABLE = Rating.prototype.tableName;
var TARGETS_TABLE = Target.prototype.tableName;

// This method uses knex directly to improve performance:
// See this issue: https://github.com/tgriesser/bookshelf/issues/774
// that's why it contains so much extra validation.
function getRatings(params, internalOpts) {
    // Opts for internal use: meaning that other services may use these options
    // to e.g. disable safety features
    internalOpts = _.merge({
        disableLimit: false,
        includeAllFields: false
    }, internalOpts);

    // Validate parameters
    var opts = serviceUtils.pickAndValidateListOpts(params, ALLOWED_SORT_KEYS);
    var whereObj = serviceUtils.pickAndValidateWheres(
        params,
        PUBLIC_TO_MODEL,
        ALLOWED_MULTI_SEARCH_KEYS
    );

    serviceUtils.validateBoolean(params.hasComment, 'hasComment');
    serviceUtils.validateBoolean(params.hasRating, 'hasRating');

    var queryBuilder;
    if (internalOpts.trx) {
        queryBuilder = internalOpts.trx;
    } else {
        queryBuilder = knex;
    }

    // Execute query
    queryBuilder = queryBuilder.select([
        'ratings.*',
        'targets.external_id as target_id',
        'targets.namespace as target_namespace',
        'targets.category as category',
        'targets.sub_category as sub_category',
        'targets.name as name',
        'targets.url as url'
    ])
    .from(RATINGS_TABLE)
    .leftJoin(
        TARGETS_TABLE + ' as ' + TARGETS_TABLE,
        RATINGS_TABLE + '.target_id',
        TARGETS_TABLE + '.id'
    );

    serviceUtils.addWheresToQuery(queryBuilder, whereObj, PUBLIC_TO_MODEL);
    var whereNotObj = {};
    if (params.hasComment) {
        whereNotObj.comment = null;
    }
    if (params.hasRating) {
        whereNotObj.rating = null;
    }
    serviceUtils.addWhereNotsToQuery(queryBuilder, whereNotObj);

    var countQueryOpts = {trx: internalOpts.trx};
    var countQuery = serviceUtils.countQuery(queryBuilder, countQueryOpts);

    // We need to do limitations and offset calculations after building
    // the countQuery
    if (!internalOpts.disableLimit) {
        queryBuilder = queryBuilder.limit(opts.limit);
    }
    queryBuilder = queryBuilder.offset(opts.offset);
    serviceUtils.addSortsToQuery(queryBuilder, opts.sort, PUBLIC_TO_MODEL);

    return countQuery.then(function(result) {
        var totalCount = Number(result[0].count);

        return queryBuilder.then(function(rows) {
            var data = _.map(rows, function(row) {
                // Disable omit when passing the object through rating's parse
                var publicRatingObj = Rating.prototype.parse(row);

                return formatRatingSafe(publicRatingObj, internalOpts);
            });

            return {
                totalCount: totalCount,
                data: data
            };
        });
    });
}

// XXX: This method, like others besides getRatings do not care about the
//      published status of ratings.
function getRating(ratingId, internalOpts) {
    validate(ratingId, 'id', modelUtils.schema.bigInteger().required());
    internalOpts = _.merge({
        includeAllFields: false
    }, internalOpts);

    return Rating
    .forge({id: ratingId})
    .fetch({withRelated: ['target']})
    .then(function(model) {
        if (!model) {
            var err = new Error('Rating does not exist');
            err.status = 404;
            throw err;
        }

        var publicRatingObj = _privateToPublicRating(model.toJSON());
        return formatRatingSafe(publicRatingObj, internalOpts);
    });
}

// NOTE: This method is vulnerable to race-conditions. (Maybe other methods too)
//   Imagine this scenario with 2 concurrent requests:
//   * 1 starts transaction, fetches if a target exists
//   * 2 starts transaction exactly at the same time, fetches if a target exists
//   * 1 gets response from db: target does not exist, so it creates a new one
//   * 2 gets response from db: target does not exist, so it creates a new one
//
// This is a known risk, the reason for taking this risk is:
// * The service is not on very high load currently
//   The worst that could happen is that out of a few concurrent rating
//   creations, only the first will succeed and the rest will fail to unique
//   constraint error when trying to create duplicate target
// * Implementing table lock would potentially decrease performance a lot
// * Implementing advisory lock would be tricky to implement
//
// Other considered implementation:
// Catch unique constraint error at application side and trust that the target
// is then created. This wasn't easy either since when a promise throws error
// Knex rollbacks the transaction automatically
//
// For reference, this is how table locking can be achieved:
// trx.raw('LOCK TABLE targets IN SHARE ROW EXCLUSIVE MODE')
//
// In tests, this issue is prevented by not doing concurrent requests to the
// API. If you want to reproduce the issue, change tests so that
// They do high amount of concurrent requests to the API
function createRating(ratingObj, internalOpts) {
    internalOpts = _.merge({
        includeAllFields: false
    }, internalOpts);

    var newTargetObj = _publicToPrivateTarget(ratingObj);
    var newRatingObj = _publicToPrivateRating(ratingObj);

    // XXX: If you forget to pass transaction to all individual database
    //      queries inside the transaction, the query might end up to a
    //      dead lock.
    return bookshelf.transaction(function(trx) {
        return targetService.createOrUpdateTarget(newTargetObj, {transacting: trx})
        .then(function(targetModel) {
            // XXX: This fetch is doing unnecessary work if the new rating
            //      doesn't have a numeric rating
            return Promise.props({
                targetModel: targetModel,
                err: _throwIfTooManyNumericRatings(
                    newTargetObj.externalId,
                    ratingObj.authorId,
                    newRatingObj.rating,
                    {trx: trx}
                ),
                settings: settingService.getSetting(CONST.GLOBAL_SETTINGS_KEY, {
                    transacting: trx
                })
            });
        })
        .then(function(result) {
            var targetModel = result.targetModel;

            // Link target to the model
            newRatingObj.targetId = targetModel.id;

            // These defaults are also set at db level, but if they are
            // not explicitly set at app level, knex/bookshelf tries to
            // insert null values to db
            newRatingObj.reportCount = 0;

            // Note: only users above service role can even set these parameters
            //       that is handled at controller level.

            var settings = result.settings;
            var defaultPublished = settings.publishAutomatically;
            var published = newRatingObj.published;
            newRatingObj.published = _.isUndefined(published)
                ? defaultPublished
                : published;

            var defaultModerated = settings.publishAutomatically;
            var moderated = newRatingObj.moderated;
            newRatingObj.moderated = _.isUndefined(moderated)
                ? defaultModerated
                : moderated;

            var replyRequested = newRatingObj.replyRequested;
            newRatingObj.replyRequested = _.isUndefined(replyRequested)
                ? false
                : replyRequested;

            var newRating = new Rating(newRatingObj);
            return Promise.props({
                targetModel: targetModel,
                ratingModel: newRating.save(null, {transacting: trx})
            })
        });
    })
    .then(function(result) {
        var createdRatingObj = result.ratingModel.toJSON();
        createdRatingObj.target = result.targetModel.toJSON();
        var publicRatingObj = _privateToPublicRating(createdRatingObj);

        serviceUtils.deleteFromRedis(
            CONST.REDIS_PREFIX.RATING_SUMMARIES,
            publicRatingObj.targetNamespace,
            publicRatingObj.targetId
        );

        return formatRatingSafe(publicRatingObj, internalOpts);
    });
}

function updateRating(ratingId, updatedPublicRatingObj, internalOpts) {
    validate(ratingId, 'id', modelUtils.schema.bigInteger().required());
    internalOpts = _.merge({
        includeAllFields: false
    }, internalOpts);

    return bookshelf.transaction(function(trx) {
        return Rating
        .forge({id: ratingId})
        .fetch({transacting: trx, withRelated: ['target']})
        .then(function(ratingModel) {
            if (!ratingModel) {
                var err = new Error('Rating does not exist');
                err.status = 404;
                throw err;
            }

            var ratingObj = ratingModel.toJSON();
            var updatedTargetObj = _publicToPrivateTarget(updatedPublicRatingObj);
            var updatedRatingObj = _publicToPrivateRating(updatedPublicRatingObj);

            // Promise chain is a bit messy but this way errors are caught
            return Promise.resolve()
            .then(function() {
                var alreadyHasNumericRating = _.isNumber(ratingObj.rating);
                if (!alreadyHasNumericRating) {
                    return _throwIfTooManyNumericRatings(
                        updatedTargetObj.externalId,
                        updatedRatingObj.authorId,
                        updatedRatingObj.rating,
                        {trx: trx}
                    );
                }
            })
            .then(function() {
                return targetService.updateTarget(
                    ratingObj.target.id,
                    updatedTargetObj,
                    {transacting: trx}
                );
            })
            .then(function(savedTargetModel) {
                // Forbid updating some fields
                delete updatedRatingObj.id;
                delete updatedRatingObj.authorRole;

                return ratingModel.save(updatedRatingObj, {transacting: trx})
                .then(function(savedRatingModel) {
                    return [savedTargetModel, savedRatingModel];
                });
            });
        });
    })
    .spread(function(targetModel, ratingModel) {
        var updatedRatingObj = ratingModel.toJSON();
        updatedRatingObj.target = targetModel.toJSON();
        var publicRatingObj = _privateToPublicRating(updatedRatingObj);

        // Use the newly modified object attributes. The update operation
        // might have changed targetId and targetNamespace for the rating
        serviceUtils.deleteFromRedis(
            CONST.REDIS_PREFIX.RATING_SUMMARIES,
            publicRatingObj.targetNamespace,
            publicRatingObj.targetId
        );

        return formatRatingSafe(publicRatingObj, internalOpts);
    });
}

function deleteRating(ratingId) {
    validate(ratingId, 'id', modelUtils.schema.bigInteger().required());

    return bookshelf.transaction(function(trx) {
        return Rating
        .forge({
            id: ratingId
        })
        .fetch({transacting: trx, withRelated: ['target']})
        .then(function(model) {
            if (!model) {
                var err = new Error('Rating does not exist');
                err.status = 404;
                throw err;
            }

            // Note: targets are never deleted
            return [model.destroy({transacting: trx}), model.toJSON()];
        })
        .spread(function(destroyValue, deletedRatingObj) {
            serviceUtils.deleteFromRedis(
                CONST.REDIS_PREFIX.RATING_SUMMARIES,
                deletedRatingObj.target.namespace,
                deletedRatingObj.target.externalId
            );
        });
    });
}

function reportSpam(ratingId) {
    validate(ratingId, 'ratingId', modelUtils.schema.bigInteger().required());

    return bookshelf.transaction(function(trx) {
        return Rating
        .query()
        .transacting(trx)
        .increment('report_count', 1)
        .where({id: ratingId})
        .returning('*')
        .then(function(rows) {
            if (_.isEmpty(rows)) {
                var err = new Error('Rating does not exist');
                err.status = 404;
                throw err;
            }

            var ratingObj = Rating.prototype.parse(rows[0]);
            return Promise.props({
                ratingObj: ratingObj,
                settings: settingService.getSetting(CONST.GLOBAL_SETTINGS_KEY, {
                    transacting: trx
                })
            });
        })
        .then(function(result) {
            var ratingObj = result.ratingObj;
            var settings = result.settings;

            if (settings.reportCountHideEnabled &&
                ratingObj.reportCount >= settings.reportCountHideThreshold) {

                var msg = 'Rating with id ' + ratingObj.id + ' has been reported';
                msg += ' over ' + settings.reportCountHideThreshold + ' times';
                logger.info(msg)
                logger.info('Now it has been reported', ratingObj.reportCount, 'times');
                logger.info('Setting the rating state to QUEUE.');

                var newRatingObj = _.merge({}, ratingObj, {
                    published: false,
                    moderated: false
                });

                return _updatePrivateRating(ratingObj.id, newRatingObj, {
                    transacting: trx
                });
            }

            return Promise.resolve();
        })
        .then(function() {
            // Will be responded as empty body
            return undefined;
        })
        .then(trx.commit)
        .catch(trx.rollback);
    });
}

function formatRatingSafe(publicRatingObj, opts) {
    opts = _.merge({
        includeAllFields: false
    }, opts);

    if (opts.includeAllFields) {
        return publicRatingObj;
    }

    return omitModeratorFields(publicRatingObj);
}

function omitModeratorFields(publicRatingObj) {
    return _.pick(publicRatingObj, SERVICE_USER_KEYS);
}

// Takes a rating model .toJSON() fetched with {withRelated: ['target']}
// and returns the rating to outside world as the API spec says
function _privateToPublicRating(modelObj) {
    var objCopy = _.cloneDeep(modelObj);

    objCopy.targetNamespace = objCopy.target.namespace;
    objCopy.targetId = objCopy.target.externalId;
    _.each(['name', 'url', 'category', 'subCategory'], function(attr) {
        objCopy[attr] = objCopy.target[attr];
    });

    delete objCopy.target;
    return objCopy;
}

function _publicToPrivateRating(ratingObj) {
    var objCopy = _.cloneDeep(ratingObj);
    delete objCopy.targetId;
    delete objCopy.targetNamespace;
    delete objCopy.category;
    delete objCopy.subCategory;
    delete objCopy.name;
    delete objCopy.url;
    return objCopy;
}

function _publicToPrivateTarget(ratingObj) {
    return {
        externalId: ratingObj.targetId,
        namespace: ratingObj.targetNamespace,
        name: ratingObj.name,
        url: ratingObj.url,
        category: ratingObj.category,
        subCategory: ratingObj.subCategory
    };
}

function _throwIfTooManyNumericRatings(targetId, authorId, newRating, internalOpts) {
    return getRatings({
        targetId: String(targetId),
        authorId: String(authorId),
        hasRating: true
    }, internalOpts)
    .then(function(existingRatings) {

        if (_.isNumber(newRating) && existingRatings.totalCount > 0) {
            var msg = 'Author can\'t create a numeric rating' +
                      ' for a target more than once.';
            var err = new Error(msg);
            err.status = 403;
            throw err;
        }
    });
}

// Updates private rating object
function _updatePrivateRating(ratingId, newRatingObj, dbOpts) {
    dbOpts = dbOpts || {};

    return Rating
    .forge({id: ratingId})
    .fetch(dbOpts)
    .then(function(ratingModel) {
        if (!ratingModel) {
            var err = new Error('Rating does not exist');
            err.status = 404;
            throw err;
        }

        return ratingModel.save(newRatingObj, dbOpts);
    });
}

module.exports = {
    getRatings: getRatings,
    getRating: getRating,
    createRating: createRating,
    updateRating: updateRating,
    deleteRating: deleteRating,
    reportSpam: reportSpam,
    omitModeratorFields: omitModeratorFields
};
