var passport = require('passport');
var Promise = require('bluebird');
var _ = require('lodash');
var bcrypt = Promise.promisifyAll(require('bcrypt'));
var userService = require('./user-service');
var CONST = require('../constants');
var logger = require('../logger')(__filename);

var FORBIDDEN_MESSAGE = 'Invalid credentials.';

function isRoleAboveService(role) {
    var aboveRoles = [
        CONST.USER_ROLES.ADMIN,
        CONST.USER_ROLES.MODERATOR
    ];

    return _.contains(aboveRoles, role);
}

function isAuthorRoleAllowedForUser(userRole, authorRole) {
    var allowedRoles = [
        CONST.AUTHOR_ROLES.ANONYMOUS,
        CONST.AUTHOR_ROLES.REGISTERED
    ];

    if (isRoleAboveService(userRole)) {
        allowedRoles.push(CONST.AUTHOR_ROLES.MODERATOR);
    }

    return _.contains(allowedRoles, authorRole);
}

function requireRole(roles) {
    if (!_.isArray(roles)) {
        roles = [roles];
    }

    return function ensureUserRole(req, res, next) {
        if (!req.user) {
            return _respondForbidden(req, res, next);
        }

        // If req.user exists, it means user has at least some token
        var isRoleEnough = _.contains(roles, req.user.userRole);
        if (isRoleEnough) {
            next();
        } else {
            logger.warn('Forbidden request! User:');
            logger.warn(JSON.stringify(req.user));
            logger.warn('Required role:' + JSON.stringify(roles));
            return _respondForbidden(req, res, next);
        }
    };
}

// It's express style to have factory functions
function requireAuthenticated() {
    return function ensureAuthenticated(req, res, next) {
        if (req.isAuthenticated()) {
            // Session found
            return next();
        }

        // If no session is detected, check if API token is present
        var apiAuth = passport.authenticate('local-generic', {session: false});
        return apiAuth(req, res, next);
    }
}

// Returns promise which will resolve with true/false depending on if the
// user credentials are correct or not
function checkUserCredentials(username, password) {
    if (!username || !password) {
        Promise.resolve(false);
    }

    return userService.getUserByUsername(username, {includePassword: true})
    .then(function(user) {
        if (!user) {
            return false;
        }

        var hash = user.password;
        delete user.password;  // Delete just in case

        return isPasswordCorrect(password, hash)
        .then(function(isCorrect) {
            return {
                user: user,
                isPasswordCorrect: isCorrect
            };
        });
    })
    .catch(function(err) {
        logger.error('Error when checking validity of user credentials:');
        logger.error(err);
        return false;
    });
}

function createPasswordHash(password) {
    return bcrypt.hashAsync(password, CONST.PASSWORD_HASH_SALT_LENGTH);
}

function isPasswordCorrect(password, hash) {
    return bcrypt.compareAsync(password, hash);
}

function _respondForbidden(req, res, next) {
    logger.warn('Forbidden request, headers:');
    logger.warn(JSON.stringify(req.headers));
    var err = new Error(FORBIDDEN_MESSAGE);
    err.status = 403;
    next(err);
}

module.exports = {
    isRoleAboveService: isRoleAboveService,
    isAuthorRoleAllowedForUser: isAuthorRoleAllowedForUser,
    requireRole: requireRole,
    requireAuthenticated: requireAuthenticated,
    checkUserCredentials: checkUserCredentials,
    createPasswordHash: createPasswordHash,
    isPasswordCorrect: isPasswordCorrect
};
