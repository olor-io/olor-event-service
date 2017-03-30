var express = require('express');
var eventController = require('./controllers/event-controller');
var reportController = require('./controllers/report-controller');
var CONST = require('./constants');
//var passport = require('passport');
//var authService = require('./services/auth-service');

// Always use createRoute function to create new endpoints
// unless you are creating public routes
function createRouter() {
    var router = express.Router();

    // Events
    createRoute(router, {
        method: 'get',
        url: '/events',
        roles: CONST.USER_ROLE_GROUPS.ALL,
        callback: eventController.getEvents
    });

    createRoute(router, {
        method: 'get',
        url: '/events/:id',
        roles: CONST.USER_ROLE_GROUPS.ALL,
        callback: eventController.getEvent
    });

    createRoute(router, {
        method: 'post',
        url: '/events',
        roles: CONST.USER_ROLE_GROUPS.ALL,
        callback: eventController.postEvent
    });

    createRoute(router, {
        method: 'put',
        url: '/events/:id',
        roles: CONST.USER_ROLE_GROUPS.ALL,
        callback: eventController.putEvent
    });

    createRoute(router, {
        method: 'delete',
        url: '/events/:id',
        roles: CONST.USER_ROLE_GROUPS.ALL,
        callback: eventController.deleteEvent
    });

    // Utility
    createRoute(router, {
        method: 'get',
        url: '/reports/distances',
        roles: CONST.USER_ROLE_GROUPS.ABOVE_MODERATOR,
        callback: reportController.getEventDistances
    });

    return router;
}

// If opts.roles is not given, by default the route will be admin-only
function createRoute(router, opts) {
    var routeParams = [opts.url];

    //routeParams.push(authService.requireAuthenticated());

    // Default: admin-only
    //var roles = opts.roles ? opts.roles : [CONST.USER_ROLES.ADMIN];
    //routeParams.push(authService.requireRole(roles));
    routeParams.push(opts.callback);
    router[opts.method].apply(router, routeParams);
}

module.exports = createRouter;
