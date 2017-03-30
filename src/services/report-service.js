// Service to handle all operations related to event-specific reports

var CONST = require('../constants');
var Event_ = require('../models/event-model');
var UserEvent = require('../models/user-event-model');
var User = require('../models/user-model');
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
    // User
    userId: {model: User, attribute: 'userId'},
    userLat: {model: User, attribute: 'lat'},
    userLong: {model: User, attribute: 'long'},

    // UserEvent
    userId: {model: UserEvent, attribute: 'userId'},
    eventId: {model: UserEvent, attribute: 'eventId'},
    distance: {model: UserEvent, attribute: 'distance'},
    descriptionLength: {model: UserEvent, attribute: 'descriptionLength'},
    capacityLeft: {model: UserEvent, attribute: 'capacityLeft'},

    // Event_
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
    'descriptionLength',
    'capacityLeft',
    'distance',
    'participants',
    'creatorId',
    'adminId',
    'distance'
];

// These should correspond to indexes in database
// If you add new sortable columns, check indexes in database
var ALLOWED_SORT_KEYS = [
    'id',
    'userId',
    'eventId',
    'categoryId',
    'creatorId',
    'adminId',
    'lat',
    'long',
    'distance',
    'createdAt',
    'updatedAt'
];

// Fields which will be only returned for service users, others are considered
// as moderator fields. Use whitelist instead of blacklist
var SERVICE_USER_KEYS = [
    'id',
    'userId',
    'eventId',
    'categoryId',
    'creatorId',
    'adminId',
    'descriptionLength',
    'capacityLeft',
    'distance',
    'startTime',
    'createdAt',
    'updatedAt'
];

var EVENTS_TABLE = Event_.prototype.tableName;
var USER_EVENTS_TABLE = UserEvent.prototype.tableName;
var USERS_TABLE = User.prototype.tableName;

function getEventDistances(params, internalOpts) {
    internalOpts = _.merge({
        disableLimit: false,
        includeAllFields: true
    }, internalOpts);

    var queryBuilder = knex.select(
        'id as eventId',
        'category_id as categoryId',
        'lat as lat',
        'long as long',
        'creator_id as creatorId',
        'admin_id as adminId',
        knex.raw('character_length(description) as "descriptionLength"'),
        knex.raw('cast((100.0 * cur_participants / max_participants) * 100.0 as integer) as "capacityLeft"'),
        'start_time as startTime',
        'created_at as createdAt',
        'updated_at as updatedAt'
    )
    .from(EVENTS_TABLE);

    var opts = serviceUtils.pickAndValidateListOpts(params, ALLOWED_SORT_KEYS);

    return queryBuilder.then(function(rows) {
        var data = _.map(rows, function(row) {
            var userEventObj = UserEvent.prototype.parse(row);

            // Gets distance from user to each events in meters
            // Accuracy is set to 1 (distinct meters)
            userEventObj.distance = geo.getDistance(
                {latitude: params.lat, longitude: params.long},
                {latitude: userEventObj.lat, longitude: userEventObj.long} , 1);

            return formatEventSafe(userEventObj, internalOpts);
        });

        data = serviceUtils.addSortsToJsonData(data, opts.sort);
        data = serviceUtils.addLimitAndOffsetToJsonData(data, opts.offset, opts.limit);

        return {
            totalCount: _.size(data),
            data: data
        };
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
    getEventDistances: getEventDistances,
    omitModeratorFields: omitModeratorFields
};
