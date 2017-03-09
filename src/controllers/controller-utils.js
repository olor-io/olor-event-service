var _ = require('lodash');
var http = require('http');

// Factory function to create a new route handler
// This function prevents boilerplate in controllers
// All services must return a promise
// If the service is synchronous, they need to e.g. Promise.resolve(1);
// `func` must return a promise
function createJsonRoute(func) {
    return createRoute(func, function sendJsonResponse(data, req, res, next) {
        res.json(data);
    });
}

function createRoute(func, responseHandler) {
    return function route(req, res, next) {
        try {
            if (_.isFunction(responseHandler)) {
                func(req, res)
                .then(function(data) {
                    return responseHandler(data, req, res, next);
                })
                .catch(next);
            } else {
                func(req, res, next)
                .catch(next);
            }

        } catch (err) {
            next(err);
        }
    };
}

// In route functions, use
// e.g. return throwStatus(500)
// So that it's clear to see where execution stops
function throwStatus(status) {
    var err = new Error(http.STATUS_CODES[status]);
    err.status = status;
    throw err;
}

function splitSortString(sortString) {
    return sortString.split(':');
}

function getQueryBoolean(queryValue) {
    if (_.isString(queryValue)) {
        return queryValue.toLowerCase() === 'true';
    }
    return undefined;
}

module.exports = {
    createRoute: createRoute,
    createJsonRoute: createJsonRoute,
    throwStatus: throwStatus,
    splitSortString: splitSortString,
    getQueryBoolean: getQueryBoolean
};
