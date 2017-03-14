var Joi = require('joi');
var bookshelf = require('../database').connect().bookshelf;
var modelUtils = require('./model-utils');
var BaseModel = modelUtils.createBaseModel(bookshelf);

var schema = {
    // Id, creation time and modification time are specified in base model on default
    lat: Joi.number().precision(6).min(-90).max(90).required(),
    long: Joi.number().precision(6).min(-180).max(180).required(),
    distance: Joi.number().integer().required()
};

var EventDistance = BaseModel.extend({
    tableName: 'events',
    schema: schema,

    initialize: function() {
        BaseModel.prototype.initialize.apply(this, arguments);
    }
});

module.exports = bookshelf.model('EventDistance', EventDistance);
