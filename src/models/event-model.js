var Joi = require('joi');
var bookshelf = require('../database').connect().bookshelf;
var modelUtils = require('./model-utils');
var BaseModel = modelUtils.createBaseModel(bookshelf);

var schema = {
    // Id, creation time and modification time are specified in base model on default
    name: Joi.string().min(1, 'utf8').max(100, 'utf8').required(),
    description: Joi.string().min(1, 'utf8').max(2000, 'utf8').optional(),
    startTime: Joi.date().iso().required(),
    duration: Joi.number().integer().required(),
    maxParticipants: Joi.number().integer().required(),
    curParticipants: Joi.number().integer().required(),
    lat: Joi.number().precision(6).min(-90).max(90).required(),
    long: Joi.number().precision(6).min(-180).max(180).required(),
    address: Joi.string().max(500, 'utf8').optional(),
    // coordinates: Joi.string().required(),
    creatorId: modelUtils.schema.stringId().required(),
    adminId: modelUtils.schema.stringId().required(),
    reviewDeadline: Joi.date().iso().required(),
    chatId: Joi.number().integer().required(),
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

module.exports = bookshelf.model('Event_', Event_);
