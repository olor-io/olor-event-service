var _ = require('lodash');
var Joi = require('joi');
var bookshelf = require('../database').connect().bookshelf;
var modelUtils = require('./model-utils');
var BaseModel = modelUtils.createBaseModel(bookshelf);
var CONST = require('../constants');

var schema = {
    // Id, creation time and modification time are specified in base model on default
    name: Joi.string().min(1, 'utf8').max(100, 'utf8').required(),
    description: Joi.string().min(1, 'utf8').max(2000, 'utf8').optional(),
    startTime: Joi.date().iso().required(),
    duration: Joi.number().integer().required(),
    maxParticipantAmount: Joi.number().integer().required(),
    currentParticipantAmount: Joi.number().integer().required(),
    coordinates: modelUtils.schema.stringId().required(),
    creatorId: modelUtils.schema.stringId().required(),
    adminId: modelUtils.schema.stringId().required()
    reviewDeadLineTime: Joi.date().iso().required(),
    eventChatId: Joi.number().integer().required(),
    categoryId: Joi.number().integer().required()
};

var Event_ = BaseModel.extend({
    tableName: 'events',
    schema: schema,

    initialize: function() {
        BaseModel.prototype.initialize.apply(this, arguments);
    },

    userEvents: function() {
        return this.hasMany('UserEvent');
    }
});

module.exports = bookshelf.model('Event', Event_);
