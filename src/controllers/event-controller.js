var logger = require('../logger')(__filename);
var _ = require('lodash');
var eventService = require('../services/event-service');
//var authService = require('../services/auth-service');
var controllerUtils = require('./controller-utils');
var Event = require('../models/event-model');
var CONST = require('../constants');
var validate = require('../services/service-utils').validate;
var createJsonRoute = controllerUtils.createJsonRoute;

var FORBIDDEN_MESSAGE = 'Forbidden. Author is not allowed to do the operation.';

var getRatings = createJsonRoute(function getRatings(req, res) {
    // This should be kept in sync with getRatingsReport in report-controller
    var params = {
        targetNamespace: req.params.targetNamespace,
        targetId:        req.query.targetId,
        authorId:        req.query.authorId,
        category:        req.query.category,
        subCategory:     req.query.subCategory,
        hasRating:       controllerUtils.getQueryBoolean(req.query.hasRating),
        hasComment:      controllerUtils.getQueryBoolean(req.query.hasComment),
        offset:          req.query.offset,
        limit:           req.query.limit
    };

    var serviceOpts = {};
    var userRole = req.user.userRole;
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

    if (_.isArray(req.query.sort)) {
        params.sort = _.map(req.query.sort, controllerUtils.splitSortString);
    } else if (_.isString(req.query.sort)) {
        params.sort = [controllerUtils.splitSortString(req.query.sort)];
    }

    return ratingService.getRatings(params, serviceOpts)
    .then(function(result) {
        res.setHeader(CONST.HEADER_TOTAL_COUNT, result.totalCount);
        return result.data;
    });
});

var postRating = createJsonRoute(function postRating(req, res) {
    var ratingObj = {
        targetId:        req.body.targetId,
        targetNamespace: req.params.targetNamespace,
        rating:          req.body.rating,
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
    };

    var serviceOpts = {};
    var userRole = req.user.userRole;
    if (authService.isRoleAboveService(userRole)) {
        ratingObj.published = req.body.published;
        ratingObj.moderated = req.body.moderated;
        serviceOpts.includeAllFields = true;
    }

    throwIfAuthorRoleNotAllowed(userRole, ratingObj.authorRole);

    logger.info('operation=createRating');
    logger.info('headers: ' + JSON.stringify(req.headers));
    return ratingService.createRating(ratingObj, serviceOpts);
});

// XXX: Now it's possible to get ratings which are not published by knowing their id
//      Users need to see their own ratings but this allowes also others to see
//      them
var getRating = createJsonRoute(function getRating(req, res) {
    var serviceOpts = {};
    var userRole = req.user.userRole;
    if (authService.isRoleAboveService(userRole)) {
        serviceOpts.includeAllFields = true;
    }

    return ratingService.getRating(req.params.id, serviceOpts);
});

var putRating = createJsonRoute(function putRating(req, res) {
    var ratingId = req.params.id;
    var userRole = req.user.userRole;

    return ratingService.getRating(ratingId)
    .then(function(existingRating) {
        // Prevent author x from modifying author y's rating
        if (!authService.isRoleAboveService(userRole) &&
            existingRating.authorId !== req.user.authorId) {
            var err = new Error(FORBIDDEN_MESSAGE);
            err.status = 403;
            throw err;
        }

        var ratingObj = {
            targetId:        req.body.targetId,
            targetNamespace: req.body.targetNamespace,
            rating:          req.body.rating,
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

        logger.info('operation=updateRating ratingId=' + ratingId);
        logger.info('headers: ' + JSON.stringify(req.headers));
        return ratingService.updateRating(ratingId, ratingObj, serviceOpts);
    });
});

var deleteRating = createJsonRoute(function deleteRating(req, res) {
    var ratingId = req.params.id;
    var userRole = req.user.userRole;

    return ratingService.getRating(ratingId)
    .then(function(existingRating) {
        // Prevent author x from deleting author y's rating
        if (!authService.isRoleAboveService(userRole) &&
            existingRating.authorId !== req.user.authorId) {
            var err = new Error(FORBIDDEN_MESSAGE);
            err.status = 403;
            throw err;
        }

        logger.info('operation=deleteRating ratingId=' + ratingId);
        logger.info('headers: ' + JSON.stringify(req.headers));
        return ratingService.deleteRating(ratingId);
    })
    .then(function() {
        // If deletion succeeds, return undefined which will be responded
        // as empty body
        return undefined;
    });
});

var postSpamReport = createJsonRoute(function postSpamReport(req, res) {
    return ratingService.reportSpam(req.params.ratingId);
});

function throwIfAuthorRoleNotAllowed(userRole, authorRole) {
    validate(authorRole, 'authorRole', Rating.prototype.schema.authorRole);

    if (!authService.isAuthorRoleAllowedForUser(userRole, authorRole)) {
        var msg = FORBIDDEN_MESSAGE + ' "authorRole" is not allowed.';
        var err = new Error(msg);
        err.status = 403;
        throw err;
    }
}

module.exports = {
    getRatings: getRatings,
    postRating: postRating,
    getRating: getRating,
    putRating: putRating,
    deleteRating: deleteRating,
    postSpamReport: postSpamReport
};
