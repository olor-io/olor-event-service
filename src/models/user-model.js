var _ = require('lodash');
var Joi = require('joi');
var bookshelf = require('../database').connect().bookshelf;
var modelUtils = require('./model-utils');
var BaseModel = modelUtils.createBaseModel(bookshelf);
var CONST = require('../constants');

var schema = {
    // Optional id, creation time and modification time are specified in base model on default
    userId: modelUtils.stringId().required(),
    firstName: Joi.string().min(1, 'utf8').max(50, 'utf8').required(),
    lastName: Joi.string().min(1, 'utf8').max(100, 'utf8').required(),
    age: Joi.number().min(CONST.USER_MIN_AGE).max(CONST.USER_MAX_AGE).integer().required(),
    bio: Joi.string().min(1, 'utf8').max(300, 'utf8').optional(),
    pictureUrl: Joi.string().uri({scheme: ['http', 'https']}).min(1).max(2000).optional(),
    eventDistanceArea: Joi.number().integer().required(),
    karma: Joi.number().integer().required()
};

var User = BaseModel.extend({
    tableName: 'users',
    schema: schema,

    initialize: function() {
        BaseModel.prototype.initialize.apply(this, arguments);
    },

    userEvents: function() {
        return this.hasMany('UserEvent');
    }
});

module.exports = bookshelf.model('User', User);
