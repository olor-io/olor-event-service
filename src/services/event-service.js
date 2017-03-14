// Service to handle all operations related to events

var CONST = require('../constants');
var Event_ = require('../models/event-model');
var UserEvent = require('../models/user-event-model');
var EventDistance = require('../models/event-distance-model');
var modelUtils = require('../models/model-utils');
var serviceUtils = require('./service-utils');

var Promise = require('bluebird');
var _ = require('lodash');
var geo = require('geolib');
var logger = require('../logger')(__filename);
var validate = serviceUtils.validate;
var db = require('../database').connect();
var knex = db.knex;
var bookshelf = db.bookshelf;

// Maps public API attributes to internal database objects
var PUBLIC_TO_MODEL = {
    userId: {model: UserEvent, attribute: 'userId'},
    eventId: {model: UserEvent, attribute: 'eventId'},
    categoryId: {model: Event_, attribute: 'categoryId'},
    chatId: {model: Event_, attribute: 'chat'},
    name: {model: Event_, attribute: 'name'},
    description: {model: Event_, attribute: 'description'},
    startTime: {model: Event_, attribute: 'startTime'},
    duration: {model: Event_, attribute: 'duration'},
    maxParticipants: {model: Event_, attribute: 'maxParticipants'},
    curParticipants: {model: Event_, attribute: 'curParticipants'},
    lat: {model: Event_, attribute: 'lat'},
    long: {model: Event_, attribute: 'long'},
    address: {model: Event_, attribute: 'address'},
    creatorId: {model: Event_, attribute: 'creatorId'},
    adminId: {model: Event_, attribute: 'adminId'},
    reviewDeadline: {model: Event_, attribute: 'reviewDeadline'},
    createdAt: {model: Event_, attribute: 'createdAt'},
    updatedAt: {model: Event_, attribute: 'updatedAt'},
    participants: {model: Event_, attribute: 'participants'}
};

// Based on these columns, events can be searched so that
// the value is single value or array of values.
var ALLOWED_MULTI_SEARCH_KEYS = [
    'id',
    'userId',
    'eventId',
    'categoryId',
    'maxParticipants',
    'curParticipants',
    'lat',
    'long',
    'participants',
    'creatorId',
    'adminId'
];

// These should correspond to indexes in database
// If you add new sortable columns, check indexes in database
var ALLOWED_SORT_KEYS = [
    'id',
    'userId',
    'eventId',
    'categoryId',
    'creatorId',
    'lat',
    'long',
    'adminId',
    'createdAt',
    'updatedAt'
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
    'lat',
    'long',
    'participants',
    'address',
    'creatorId',
    'adminId',
    'createdAt',
    'updatedAt'
];

var EVENTS_TABLE = Event_.prototype.tableName;
var USER_EVENTS_TABLE = UserEvent.prototype.tableName;

// This method uses knex directly to improve performance:
// See this issue: https://github.com/tgriesser/bookshelf/issues/774
function getEvents(params, internalOpts) {
    // Opts for internal use: meaning that other services may use these options
    internalOpts = _.merge({
        disableLimit: false,
        includeAllFields: true
    }, internalOpts);

    var opts = serviceUtils.pickAndValidateListOpts(params, ALLOWED_SORT_KEYS);
    var whereObj = serviceUtils.pickAndValidateWheres(
        params, PUBLIC_TO_MODEL, ALLOWED_MULTI_SEARCH_KEYS
    );

    // Execute query
    var queryBuilder = knex
    .select(
      'events.id',
      'events.name',
      'events.description',
      'events.start_time',
      'events.duration',
      'events.review_deadline',
      'events.max_participants',
      'events.cur_participants',
      'events.creator_id',
      'events.admin_id',
      knex.raw('json_agg(' + USER_EVENTS_TABLE + '.user_id) as participants'),
      'events.category_id',
      'events.chat_id',
      'events.lat',
      'events.long',
      'events.address',
      'events.created_at',
      'events.updated_at'
    )
    .from(EVENTS_TABLE + ' as ' + EVENTS_TABLE)
    .leftJoin(
          USER_EVENTS_TABLE + ' as ' + USER_EVENTS_TABLE,
          EVENTS_TABLE + '.id',
          USER_EVENTS_TABLE + '.event_id'
    )
    .groupBy(EVENTS_TABLE + '.id', USER_EVENTS_TABLE + '.event_id');

    var countQueryOpts = { trx: internalOpts.trx };
    var countQuery = serviceUtils.countQuery(queryBuilder, countQueryOpts);

    if (!internalOpts.disableLimit) {
        queryBuilder = queryBuilder.limit(opts.limit);
    }

    // Add wheres, offsets and sorts to query passed in params
    serviceUtils.addWheresToQuery(queryBuilder, whereObj, PUBLIC_TO_MODEL);
    queryBuilder = queryBuilder.offset(opts.offset);
    serviceUtils.addSortsToQuery(queryBuilder, opts.sort, PUBLIC_TO_MODEL);

    return countQuery.then(function(res) {
        var totalCount = Number(res[0].count);

        return queryBuilder.then(function(rows) {
            var data = _.map(rows, function(row) {
                var publicEventObj = Event_.prototype.parse(row);
                return formatEventSafe(publicEventObj, internalOpts);
            });

            return {
                // totalCount passed to x-total-count response header
                totalCount: totalCount,
                data: data
            };
        });
    });
}

function getEvent(eventId, internalOpts) {
    validate(eventId, 'id', modelUtils.schema.bigInteger().required());
    internalOpts = _.merge({
        includeAllFields: true
    }, internalOpts);

    return Event_.where({id: eventId}).fetch().then(function(model) {
        if (!model) {
            var err = new Error('Event does not exist');
            err.status = 404;
            throw err;
        }
        return formatEventSafe(model.toJSON(), internalOpts);
    });
}

function getEventDistances(params, internalOpts) {
    // TODO:
    //    Cleanup and utility to service-utils.

    internalOpts = _.merge({
        disableLimit: false,
        includeAllFields: true
    }, internalOpts);

    var queryBuilder = knex.select([
        'id as id',
        'name as name',
        'lat as lat',
        'long as long'
    ])
    .from(EVENTS_TABLE);

    var opts = serviceUtils.pickAndValidateListOpts(params, ALLOWED_SORT_KEYS);
    var countQueryOpts = { trx: internalOpts.trx };
    var countQuery = serviceUtils.countQuery(queryBuilder, countQueryOpts);

    if (!internalOpts.disableLimit)
        queryBuilder = queryBuilder.limit(opts.limit);

    queryBuilder = queryBuilder.offset(opts.offset);
    serviceUtils.addSortsToQuery(queryBuilder, opts.sort, PUBLIC_TO_MODEL);

    return countQuery.then(function(res) {
        var totalCount = Number(res[0].count);

        return queryBuilder.then(function(rows) {
            var data = _.map(rows, function(row) {
                var eventDistanceObj = EventDistance.prototype.parse(row);
                eventDistanceObj.distance = geo.getDistance(
                    {latitude: params.lat, longitude: params.long},
                    {latitude: eventDistanceObj.lat, longitude: eventDistanceObj.long}
                  );

                return formatEventSafe(eventDistanceObj, internalOpts);
            });

            return {
                // TODO:
                //  Better and clearer JSON output
                totalCount: totalCount,
                data: data
            };
        });
    });
}

function createEvent(eventObj) {
    // Validation on Event_.initialize
    // On validation error throws a 400 status with a message and stack
    var newEvent = new Event_(eventObj);
    return newEvent.save(null, {method: 'insert'});
}

function updateEvent(eventId, updatedEventObj) {
    return bookshelf.transaction(function(trx) {
        return Event_.where({id: eventId}).fetch().then(function(eventModel) {
            // Uses bookshelfs transaction as method option
            return eventModel.save(updatedEventObj, {transacting: trx})
        });
    });
}

function deleteEvent(eventId) {
    validate(eventId, 'id', modelUtils.schema.bigInteger().required());

    return bookshelf.transaction(function(trx) {
        return Event_.where({id: eventId}).fetch().then(function(eventModel) {
            if (!eventModel) {
                var err = new Error('Event does not exist');
                err.status = 404;
                throw err;
            }

            return [eventModel.destroy(), eventModel.toJSON()];
        });
    });
}

function formatEventSafe(publicEventObj, opts) {
    opts = _.merge({
        includeAllFields: false
    }, opts);

    if (opts.includeAllFields) {
        return publicEventObj;
    }

    return omitModeratorFields(publicEventObj);
}

function omitModeratorFields(publicEventObj) {
    return _.pick(publicEventObj, SERVICE_USER_KEYS);
}

module.exports = {
    getEvents: getEvents,
    getEvent: getEvent,
    getEventDistances: getEventDistances,
    createEvent: createEvent,
    updateEvent: updateEvent,
    deleteEvent: deleteEvent,
    omitModeratorFields: omitModeratorFields
};
