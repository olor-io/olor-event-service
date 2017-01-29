var express = require('express');
var passport = require('passport');
/*
var sessionController = require('./controllers/session-controller');
var ratingController = require('./controllers/rating-controller');
var ratingSummaryController = require('./controllers/rating-summary-controller');
var reportController = require('./controllers/report-controller');
var targetController = require('./controllers/target-controller');
var settingController = require('./controllers/setting-controller');
var authService = require('./services/auth-service');
*/

var eventController = require('./controllers/event-controller');
var CONST = require('./constants');

// Note! Always use createRoute function to create new endpoints unless
//       you are creating public routes
function createRouter() {
    var router = express.Router();

    createRoute(router, {
      method: 'get',
      url: '/events',
      roles: CONST.USER_ROLE_GROUPS.ALL,
      callback: eventController.getEvents
    });

    // One route, /health is defined in app level

    // This endpoint is public (of course)
    /*
    router.post(
        '/session',
        passport.authenticate('local', {session: true}),
        sessionController.getSession
    );
    createRoute(router, {
        method: 'get',
        url: '/session',
        roles: CONST.USER_ROLE_GROUPS.ALL,
        callback: sessionController.getSession
    });
    createRoute(router, {
        method: 'delete',
        url: '/session',
        roles: CONST.USER_ROLE_GROUPS.ALL,
        callback: sessionController.deleteSession
    });

    // List of ratings
    createRoute(router, {
        method: 'get',
        url: '/ratings/:targetNamespace',
        roles: CONST.USER_ROLE_GROUPS.ALL,
        callback: ratingController.getRatings
    });

    // Rating
    createRoute(router, {
        method: 'post',
        url: '/ratings/:targetNamespace',
        roles: CONST.USER_ROLE_GROUPS.ALL,
        callback: ratingController.postRating
    });
    createRoute(router, {
        method: 'get',
        url: '/ratings/:targetNamespace/:id',
        roles: CONST.USER_ROLE_GROUPS.ALL,
        callback: ratingController.getRating
    });
    createRoute(router, {
        method: 'put',
        url: '/ratings/:targetNamespace/:id',
        roles: CONST.USER_ROLE_GROUPS.ALL,
        callback: ratingController.putRating
    });
    createRoute(router, {
        method: 'delete',
        url: '/ratings/:targetNamespace/:id',
        roles: CONST.USER_ROLE_GROUPS.ALL,
        callback: ratingController.deleteRating
    });

    // Spam reports
    createRoute(router, {
        method: 'post',
        url: '/spam-reports/:targetNamespace/:ratingId',
        roles: CONST.USER_ROLE_GROUPS.ALL,
        callback: ratingController.postSpamReport
    });

    // List of summaries
    createRoute(router, {
        method: 'get',
        url: '/rating-summaries/:targetNamespace',
        roles: CONST.USER_ROLE_GROUPS.ALL,
        callback: ratingSummaryController.getRatingSummaries
    });

    // Summary
    createRoute(router, {
        method: 'get',
        url: '/rating-summaries/:targetNamespace/:targetId',
        roles: CONST.USER_ROLE_GROUPS.ALL,
        callback: ratingSummaryController.getRatingSummary
    });

    // Report: summary of ratings for all targets
    createRoute(router, {
        method: 'get',
        url: '/reports/summary',
        roles: CONST.USER_ROLE_GROUPS.ABOVE_MODERATOR,
        callback: reportController.getSummaryReport
    });

    // Report: list of ratings for a target
    createRoute(router, {
        method: 'get',
        url: '/reports/target/:targetNamespace/:targetId',
        roles: CONST.USER_ROLE_GROUPS.ABOVE_MODERATOR,
        callback: reportController.getTargetReport
    });

    // Report: list of ratings. Can be used to export individual comments
    createRoute(router, {
        method: 'get',
        url: '/reports/ratings',
        roles: CONST.USER_ROLE_GROUPS.ABOVE_MODERATOR,
        callback: reportController.getRatingsReport
    });

    // List of targets
    createRoute(router, {
        method: 'get',
        url: '/targets/:targetNamespace',
        roles: CONST.USER_ROLE_GROUPS.ABOVE_MODERATOR,
        callback: targetController.getTargets
    });

    // Settings
    createRoute(router, {
        method: 'get',
        url: '/settings/:key',
        roles: CONST.USER_ROLE_GROUPS.ABOVE_MODERATOR,
        callback: settingController.getSetting
    });
    createRoute(router, {
        method: 'patch',
        url: '/settings/:key',
        roles: CONST.USER_ROLE_GROUPS.ABOVE_MODERATOR,
        callback: settingController.patchSetting
    });
    */
    return router;
}

// If opts.roles is not given, by default the route will be admin-only
function createRoute(router, opts) {
    var routeParams = [opts.url];

    routeParams.push(authService.requireAuthenticated());

    // Default: admin-only
    var roles = opts.roles ? opts.roles : [CONST.USER_ROLES.ADMIN];
    routeParams.push(authService.requireRole(roles));
    routeParams.push(opts.callback);
    router[opts.method].apply(router, routeParams);
}

module.exports = createRouter;
