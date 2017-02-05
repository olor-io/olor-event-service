var express = require('express');
var passport = require('passport');
var eventController = require('./controllers/event-controller');
var authService = require('./services/auth-service');
var CONST = require('./constants');

// Always use createRoute function to create new endpoints
// unless you are creating public routes
function createRouter() {
    var router = express.Router();

    // List of events
    createRoute(router, {
        method: 'get',
        url: '/events',
        roles: CONST.USER_ROLE_GROUPS.ALL,
        callback: eventController.getEvents
    });
    // Event
    createRoute(router, {
        method: 'post',
        url: '/events',
        roles: CONST.USER_ROLE_GROUPS.ALL,
        callback: eventController.postEvent
    });

    createRoute(router, {
        method: 'get',
        url: '/events/:id',
        roles: CONST.USER_ROLE_GROUPS.ALL,
        callback: eventController.getEvent
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
