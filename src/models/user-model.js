var Joi = require('joi');
var bookshelf = require('../database').connect().bookshelf;
var modelUtils = require('./model-utils');
var BaseModel = modelUtils.createBaseModel(bookshelf);
var CONST = require('../constants');

var schema = {
    // Optional id, creation time and modification time are specified in base model on default
    userId: modelUtils.schema.stringId().primary(),
    lat: Joi.number().precision(6).min(-90).max(90).required(),
    long: Joi.number().precision(6).min(-180).max(180).required()
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
