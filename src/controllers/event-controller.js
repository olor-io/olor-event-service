var logger = require('../logger')(__filename);
var _ = require('lodash');
var ratingService = require('../services/event-service');
//var authService = require('../services/auth-service');
var controllerUtils = require('./controller-utils');
var Event_ = require('../models/event-model');
var CONST = require('../constants');
var validate = require('../services/service-utils').validate;
var createJsonRoute = controllerUtils.createJsonRoute;

var FORBIDDEN_MESSAGE = 'Forbidden. Author is not allowed to do the operation.';

var getEvents = createJsonRoute(function getEvents(req, res) {
    // This should be kept in sync with getEventsReport in report-controller
    var params = {
        id:               req.params.id,
        name:             req.params.name,
        description:      req.params.description,
        startTime:        req.params.startTime,
        duration:         req.params.duration,
        maxParticipants:  req.params.maxParticipants,
        curParticipants:  req.params.curParticipants,
        coordinates:      req.params.coordinates,
        creatorId:        req.params.creatorId,
        adminId:          req.params.adminId,
        reviewDeadline:   req.params.reviewDeadline,
        chatId:           req.params.chatId,
        categoryId:       req.params.categoryId
    };

    var serviceOpts = {};
    var userRole = req.user.userRole;
    /*
    if (authService.isRoleAboveService(userRole)) {
        params.authorRole = req.query.authorRole;
        params.published = controllerUtils.getQueryBoolean(req.query.published);
        params.moderated = controllerUtils.getQueryBoolean(req.query.moderated);
        params.replyRequested = controllerUtils.getQueryBoolean(req.query.replyRequested);

        serviceOpts.includeAllFields = true;
    } else {
        // Force services to search only published comments
        params.published = true;
    }
    */

    if (_.isArray(req.query.sort)) {
        params.sort = _.map(req.query.sort, controllerUtils.splitSortString);
    } else if (_.isString(req.query.sort)) {
        params.sort = [controllerUtils.splitSortString(req.query.sort)];
    }

    return ratingService.getEvents(params, serviceOpts)
    .then(function(result) {
        res.setHeader(CONST.HEADER_TOTAL_COUNT, result.totalCount);
        return result.data;
    });
});

var postEvent = createJsonRoute(function postEvent(req, res) {
    var ratingObj = {
        /*
        targetId:        req.body.targetId,
        targetNamespace: req.params.targetNamespace,
        event:           req.body.event,
        comment:         req.body.comment,
        name:            req.body.name,
        url:             req.body.url,
        category:        req.body.category,
        subCategory:     req.body.subCategory,
        // Prevent changing author with body
        authorId:        req.user.authorId,
        authorName:      req.body.authorName,
        authorRole:      req.body.authorRole,
        replyRequested:  req.body.replyRequested,
        ipAddress:       req.headers['x-ip-address']
        */

    };

    var serviceOpts = {};
    var userRole = req.user.userRole;
    /*
    if (authService.isRoleAboveService(userRole)) {
        ratingObj.published = req.body.published;
        ratingObj.moderated = req.body.moderated;
        serviceOpts.includeAllFields = true;
    }
    */

    //throwIfAuthorRoleNotAllowed(userRole, ratingObj.authorRole);

    logger.info('operation=createEvent');
    logger.info('headers: ' + JSON.stringify(req.headers));
    return ratingService.createEvent(ratingObj, serviceOpts);
});

// XXX: Now it's possible to get ratings which are not published by knowing their id
//      Users need to see their own ratings but this allowes also others to see
//      them
var getEvent = createJsonRoute(function getEvent(req, res) {
    var serviceOpts = {};
    /*
    var userRole = req.user.userRole;
    if (authService.isRoleAboveService(userRole)) {
        serviceOpts.includeAllFields = true;
    }
    */
    return ratingService.getEvent(req.params.id, serviceOpts);
});

var putEvent = createJsonRoute(function putEvent(req, res) {
    var ratingId = req.params.id;
    var userRole = req.user.userRole;

    return ratingService.getEvent(ratingId)
    .then(function(existingEvent) {
        // Prevent author x from modifying author y's event
        /*
        if (!authService.isRoleAboveService(userRole) &&
            existingEvent.authorId !== req.user.authorId) {
            var err = new Error(FORBIDDEN_MESSAGE);
            err.status = 403;
            throw err;
        }
        */
        var ratingObj = {
            targetId:        req.body.targetId,
            targetNamespace: req.body.targetNamespace,
            event:          req.body.event,
            comment:         req.body.comment,
            name:            req.body.name,
            url:             req.body.url,
            category:        req.body.category,
            subCategory:     req.body.subCategory,
            // Prevent changing author with new body
            authorId:        req.user.authorId,
            authorName:      req.body.authorName,
            authorRole:      req.body.authorRole,
            replyRequested:  req.body.replyRequested
        };

        // If ip address header is not sent, don't replace the old ip address
        // with empty value
        var ipAddress = req.headers['x-ip-address'];
        if (ipAddress) {
            ratingObj.ipAddress = ipAddress;
        }

        var serviceOpts = {};
        /*
        if (authService.isRoleAboveService(userRole)) {
            ratingObj.published = req.body.published;
            ratingObj.moderated = req.body.moderated;
            serviceOpts.includeAllFields = true;

            // If report count is explicitly set, we can update it
            if (_.isNumber(req.body.reportCount)) {
                ratingObj.reportCount = req.body.reportCount;
            }
        }

        throwIfAuthorRoleNotAllowed(userRole, ratingObj.authorRole);
        */

        logger.info('operation=updateEvent ratingId=' + ratingId);
        logger.info('headers: ' + JSON.stringify(req.headers));
        return ratingService.updateEvent(ratingId, ratingObj, serviceOpts);
    });
});

var deleteEvent = createJsonRoute(function deleteEvent(req, res) {
    var ratingId = req.params.id;
    var userRole = req.user.userRole;

    return ratingService.getEvent(ratingId)
    .then(function(existingEvent) {
        // Prevent author x from deleting author y's event
        /*
        if (!authService.isRoleAboveService(userRole) &&
            existingEvent.authorId !== req.user.authorId) {
            var err = new Error(FORBIDDEN_MESSAGE);
            err.status = 403;
            throw err;
        }
        */

        logger.info('operation=deleteEvent ratingId=' + ratingId);
        logger.info('headers: ' + JSON.stringify(req.headers));
        return ratingService.deleteEvent(ratingId);
    })
    .then(function() {
        // If deletion succeeds, return undefined which will be responded
        // as empty body
        return undefined;
    });
});

/*
function throwIfAuthorRoleNotAllowed(userRole, authorRole) {
    validate(authorRole, 'authorRole', Event_.prototype.schema.authorRole);

    if (!authService.isAuthorRoleAllowedForUser(userRole, authorRole)) {
        var msg = FORBIDDEN_MESSAGE + ' "authorRole" is not allowed.';
        var err = new Error(msg);
        err.status = 403;
        throw err;
    }
}
*/

module.exports = {
    getEvents: getEvents,
    postEvent: postEvent,
    getEvent: getEvent,
    putEvent: putEvent,
    deleteEvent: deleteEvent
};
