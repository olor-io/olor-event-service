var bookshelf = require('../database').connect().bookshelf;
var modelUtils = require('./model-utils');
var BaseModel = modelUtils.createBaseModel(bookshelf);

var schema = {
    // Id, creation time and modification time are specified in base model on default
    userId: modelUtils.schema.stringId().required(),
    eventId: modelUtils.schema.stringId().required()
};

var UserEvent = BaseModel.extend({
    tableName: 'user_events',
    schema: schema,

    initialize: function() {
        BaseModel.prototype.initialize.apply(this, arguments);
    },

    events: function() {
        return this.belongsTo('Event_');
    },

    users: function() {
        return this.belongsTo('User');
    }
});

module.exports = bookshelf.model('UserEvent', UserEvent);
