// Service to handle all operations related to events
// The API exposes only the concept of an event, to make the API usage easier

var CONST = require('../constants');
var Event_ = require('../models/event-model');
var UserEvent = require('../models/user-event-model');
var modelUtils = require('../models/model-utils');
var serviceUtils = require('./service-utils');

var Promise = require('bluebird');
var _ = require('lodash');
var logger = require('../logger')(__filename);
var validate = serviceUtils.validate;
var db = require('../database').connect();
var knex = db.knex;
var bookshelf = db.bookshelf;

// Maps public API attributes to internal database objects
var PUBLIC_TO_MODEL = {
    userId: {UserEvent, attribute: 'userId'},
    eventId: {model: UserEvent, attribute: 'eventId'},
    categoryId: {model: Event_, attribute: 'categoryId'},
    chatId: {model: Event_, attribute: 'chat'},
    name: {model: Event_, attribute: 'name'},
    description: {model: Event_, attribute: 'description'},
    startTime: {model: Event_, attribute: 'startTime'},
    duration: {model: Event_, attribute: 'duration'},
    maxParticipants: {model: Event_, attribute: 'maxParticipants'},
    curParticipants: {model: Event_, attribute: 'curParticipants'},
    coordinates: {model: Event_, attribute: 'coordinates'},
    creatorId: {model: Event_, attribute: 'creatorId'},
    adminId: {model: Event_, attribute: 'adminId'},
    reviewDeadline: {model: Event_, attribute: 'reviewDeadline'},
    createdAt: {model: Event_, attribute: 'createdAt'},
    updatedAt: {model: Event_, attribute: 'updatedAt'},
};

// Based on these columns, events can be searched so that
// the value is single value or array of values.
var ALLOWED_MULTI_SEARCH_KEYS = [
    'userId',
    'eventId',
    'categoryId',
    'name',
    'maxParticipants',
    'curParticipants',
    'coordinates',
    'creatorId',
    'adminId',
    'createdAt',
    'updatedAt'
];

// These should correspond to indexes in database
// If you add new sortable columns, check indexes in database
var ALLOWED_SORT_KEYS = [
    'userId',
    'eventId',
    'categoryId',
    'name',
    'coordinates',
    'creatorId',
    'adminId',
    'reviewDeadline'
];

// Fields which will be only returned for service users, others are considered
// as moderator fields. Use whitelist instead of blacklist
var SERVICE_USER_KEYS = [
    'userId',
    'eventId',
    'categoryId',
    'chatId',
    'name',
    'description',
    'startTime',
    'duration',
    'maxParticipants',
    'curParticipants',
    'coordinates',
    'creatorId',
    'adminId',
    'createdAt',
    'updatedAt'
];

var EVENTS_TABLE = Event_.prototype.tableName;
var USER_EVENTS_TABLE = UserEvent.prototype.tableName;

// This method uses knex directly to improve performance:
// See this issue: https://github.com/tgriesser/bookshelf/issues/774
// that's why it contains so much extra validation.
function getEvents(params, internalOpts) {
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
    serviceUtils.validateBoolean(params.hasEvent, 'hasEvent');

    var queryBuilder;
    if (internalOpts.trx) {
        queryBuilder = internalOpts.trx;
    } else {
        queryBuilder = knex;
    }

    // Execute query
    queryBuilder = queryBuilder.select([
        'events.*',
        'targets.external_id as target_id',
        'targets.namespace as target_namespace',
        'targets.category as category',
        'targets.sub_category as sub_category',
        'targets.name as name',
        'targets.url as url'
    ])
    .from(EVENTS_TABLE)
    .leftJoin(
        TARGETS_TABLE + ' as ' + TARGETS_TABLE,
        EVENTS_TABLE + '.target_id',
        TARGETS_TABLE + '.id'
    );

    serviceUtils.addWheresToQuery(queryBuilder, whereObj, PUBLIC_TO_MODEL);
    var whereNotObj = {};
    if (params.hasComment) {
        whereNotObj.comment = null;
    }
    if (params.hasEvent) {
        whereNotObj.event = null;
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
                // Disable omit when passing the object through event's parse
                var publicEventObj = Event.prototype.parse(row);

                return formatEventSafe(publicEventObj, internalOpts);
            });

            return {
                totalCount: totalCount,
                data: data
            };
        });
    });
}

// XXX: This method, like others besides getEvents do not care about the
//      published status of events.
function getEvent(eventId, internalOpts) {
    validate(eventId, 'id', modelUtils.schema.bigInteger().required());
    internalOpts = _.merge({
        includeAllFields: false
    }, internalOpts);

    return Event
    .forge({id: eventId})
    .fetch({withRelated: ['target']})
    .then(function(model) {
        if (!model) {
            var err = new Error('Event does not exist');
            err.status = 404;
            throw err;
        }

        var publicEventObj = _privateToPublicEvent(model.toJSON());
        return formatEventSafe(publicEventObj, internalOpts);
    });
}

function createEvent(eventObj, internalOpts) {
    internalOpts = _.merge({
        includeAllFields: false
    }, internalOpts);

    var newTargetObj = _publicToPrivateTarget(eventObj);
    var newEventObj = _publicToPrivateEvent(eventObj);

    // XXX: If you forget to pass transaction to all individual database
    //      queries inside the transaction, the query might end up to a
    //      dead lock.
    return bookshelf.transaction(function(trx) {
        return targetService.createOrUpdateTarget(newTargetObj, {transacting: trx})
        .then(function(targetModel) {
            // XXX: This fetch is doing unnecessary work if the new event
            //      doesn't have a numeric event
            return Promise.props({
                targetModel: targetModel,
                err: _throwIfTooManyNumericEvents(
                    newTargetObj.externalId,
                    eventObj.authorId,
                    newEventObj.event,
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
            newEventObj.targetId = targetModel.id;

            // These defaults are also set at db level, but if they are
            // not explicitly set at app level, knex/bookshelf tries to
            // insert null values to db
            newEventObj.reportCount = 0;

            // Note: only users above service role can even set these parameters
            //       that is handled at controller level.

            var settings = result.settings;
            var defaultPublished = settings.publishAutomatically;
            var published = newEventObj.published;
            newEventObj.published = _.isUndefined(published)
                ? defaultPublished
                : published;

            var defaultModerated = settings.publishAutomatically;
            var moderated = newEventObj.moderated;
            newEventObj.moderated = _.isUndefined(moderated)
                ? defaultModerated
                : moderated;

            var replyRequested = newEventObj.replyRequested;
            newEventObj.replyRequested = _.isUndefined(replyRequested)
                ? false
                : replyRequested;

            var newEvent = new Event(newEventObj);
            return Promise.props({
                targetModel: targetModel,
                eventModel: newEvent.save(null, {transacting: trx})
            })
        });
    })
    .then(function(result) {
        var createdEventObj = result.eventModel.toJSON();
        createdEventObj.target = result.targetModel.toJSON();
        var publicEventObj = _privateToPublicEvent(createdEventObj);

        serviceUtils.deleteFromRedis(
            CONST.REDIS_PREFIX.EVENT_SUMMARIES,
            publicEventObj.targetNamespace,
            publicEventObj.targetId
        );

        return formatEventSafe(publicEventObj, internalOpts);
    });
}

function updateEvent(eventId, updatedPublicEventObj, internalOpts) {
    validate(eventId, 'id', modelUtils.schema.bigInteger().required());
    internalOpts = _.merge({
        includeAllFields: false
    }, internalOpts);

    return bookshelf.transaction(function(trx) {
        return Event
        .forge({id: eventId})
        .fetch({transacting: trx, withRelated: ['target']})
        .then(function(eventModel) {
            if (!eventModel) {
                var err = new Error('Event does not exist');
                err.status = 404;
                throw err;
            }

            var eventObj = eventModel.toJSON();
            var updatedTargetObj = _publicToPrivateTarget(updatedPublicEventObj);
            var updatedEventObj = _publicToPrivateEvent(updatedPublicEventObj);

            // Promise chain is a bit messy but this way errors are caught
            return Promise.resolve()
            .then(function() {
                var alreadyHasNumericEvent = _.isNumber(eventObj.event);
                if (!alreadyHasNumericEvent) {
                    return _throwIfTooManyNumericEvents(
                        updatedTargetObj.externalId,
                        updatedEventObj.authorId,
                        updatedEventObj.event,
                        {trx: trx}
                    );
                }
            })
            .then(function() {
                return targetService.updateTarget(
                    eventObj.target.id,
                    updatedTargetObj,
                    {transacting: trx}
                );
            })
            .then(function(savedTargetModel) {
                // Forbid updating some fields
                delete updatedEventObj.id;
                delete updatedEventObj.authorRole;

                return eventModel.save(updatedEventObj, {transacting: trx})
                .then(function(savedEventModel) {
                    return [savedTargetModel, savedEventModel];
                });
            });
        });
    })
    .spread(function(targetModel, eventModel) {
        var updatedEventObj = eventModel.toJSON();
        updatedEventObj.target = targetModel.toJSON();
        var publicEventObj = _privateToPublicEvent(updatedEventObj);

        // Use the newly modified object attributes. The update operation
        // might have changed targetId and targetNamespace for the event
        serviceUtils.deleteFromRedis(
            CONST.REDIS_PREFIX.EVENT_SUMMARIES,
            publicEventObj.targetNamespace,
            publicEventObj.targetId
        );

        return formatEventSafe(publicEventObj, internalOpts);
    });
}

function deleteEvent(eventId) {
    validate(eventId, 'id', modelUtils.schema.bigInteger().required());

    return bookshelf.transaction(function(trx) {
        return Event
        .forge({
            id: eventId
        })
        .fetch({transacting: trx, withRelated: ['target']})
        .then(function(model) {
            if (!model) {
                var err = new Error('Event does not exist');
                err.status = 404;
                throw err;
            }

            // Note: targets are never deleted
            return [model.destroy({transacting: trx}), model.toJSON()];
        })
        .spread(function(destroyValue, deletedEventObj) {
            serviceUtils.deleteFromRedis(
                CONST.REDIS_PREFIX.EVENT_SUMMARIES,
                deletedEventObj.target.namespace,
                deletedEventObj.target.externalId
            );
        });
    });
}


module.exports = {
    getEvents: getEvents,
    getEvent: getEvent,
    createEvent: createEvent,
    updateEvent: updateEvent,
    deleteEvent: deleteEvent
};
