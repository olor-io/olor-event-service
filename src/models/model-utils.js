var Joi = require('joi');
var _ = require('lodash');
var moment = require('moment');
var changeCase = require('change-case');

var schema = {
    stringId: function() {
        return Joi.string().regex(/^[A-Za-z0-9\-_.()!@:/]+$/)
            .min(1, 'utf8').max(64, 'utf-8');
    },
    internalStringId: function() {
        return Joi.string().regex(/^[A-Za-z0-9\-_]+$/)
            .min(1, 'utf8').max(64, 'utf-8');
    },
    bigInteger: function() {
        return Joi.number().integer().max(Number.MAX_SAFE_INTEGER);
    }
};

var BASE_SCHEMA = {
    // id might be number or string, for optimization
    id: schema.bigInteger().optional(),
    createdAt: Joi.any().optional(),
    updatedAt: Joi.any().optional()
};

// Transform all object keys to certain case. Recursively do changes also for
// inner objects.
function objectKeysToCase(obj, toCase) {
    var func = toCase === 'camel' ? changeCase.camelCase : changeCase.snakeCase;

    return _.reduce(obj, function(memo, val, key) {
        if (_.isPlainObject(val))
            memo[func(key)] = objectKeysToCase(val, toCase);
        else
            memo[func(key)] = val;

        return memo;
    }, {});
}

// bookshelf needs to be initialized before basic Model can be extended
// The API is a bit weird, but that's how bookshelf works(for the time being)
// NOTE: If you override these predefined methods, remember to call these
// original functions too
// See: http://bookshelfjs.org/#Model-extend
function createBaseModel(bookshelf) {
    var BaseModel = bookshelf.Model.extend({

        hasTimestamps: ['createdAt', 'updatedAt'],

        initialize: function() {
            if (!this.schema)
                throw new Error('You should define a schema for your model.');

            this.schema = Joi.object(this.schema).keys(BASE_SCHEMA);
            this.on('saving', this.validateSave);
        },

        validateSave: function(model) {
            var validation = Joi.validate(model.attributes, this.schema);
            if (validation.error) {
                throw validation.error;
            } else {
                return validation.value;
            }
        },

        parse: function(response) {
            // Remove fields which have null value.
            response = _.omit(response, _.isNull);

            // snake_case db columns -> camelCase attributes
            var attrs = objectKeysToCase(response, 'camel');
            if (attrs.createdAt)
                attrs.createdAt = moment(attrs.createdAt);

            if (attrs.updatedAt)
                attrs.updatedAt = moment(attrs.updatedAt);

            return attrs;
        },

        toJSON: function() {
            var attrs = bookshelf.Model.prototype.toJSON.apply(this, arguments);
            attrs.createdAt = moment(this.get('createdAt')).toISOString();
            attrs.updatedAt = moment(this.get('updatedAt')).toISOString();
            return attrs;
        },

        // camelCase attributes -> snake_case db columns
        format: function(attrs) {
            return objectKeysToCase(attrs, 'snake');
        }
    });

    return BaseModel;
}

module.exports = {
    createBaseModel: createBaseModel,
    objectKeysToCase: objectKeysToCase,
    schema: schema,
    BASE_SCHEMA: BASE_SCHEMA
};
