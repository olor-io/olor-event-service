var CONST = require('../constants');
var logger = require('../logger')(__filename);
var _ = require('lodash');
var eventService = require('../services/report-service');
var controllerUtils = require('./controller-utils');
var createJsonRoute = controllerUtils.createJsonRoute;
var validate = require('../services/service-utils').validate;
var authService = require('../services/auth-service');
var FORBIDDEN_MESSAGE = 'Forbidden. Author is not allowed to do the operation.';

var getEventDistances = createJsonRoute(function getEventDistances(req, res) {
    var params = {
        lat:             req.query.lat,
        long:            req.query.long,
        offset:          req.query.offset,
        limit:           req.query.limit
    };

    var serviceOpts = {};

    if (_.isArray(req.query.sort)) {
        params.sort = _.map(req.query.sort, controllerUtils.splitSortString);
    } else if (_.isString(req.query.sort)) {
        params.sort = [controllerUtils.splitSortString(req.query.sort)];
    }

    logger.info('operation=getEventDistances');
    logger.info('headers: ' + JSON.stringify(req.headers));
    return eventService.getEventDistances(params, serviceOpts)
    .then(function(result) {
        res.setHeader(CONST.HEADER_TOTAL_COUNT, result.totalCount);
        return result.data;
    });
});

module.exports = {
    getEventDistances: getEventDistances
};
