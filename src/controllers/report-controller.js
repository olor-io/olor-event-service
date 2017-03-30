var CONST = require('../constants');
var logger = require('../logger')(__filename);
var _ = require('lodash');
var eventService = require('../services/report-service');
var controllerUtils = require('./controller-utils');
var createJsonRoute = controllerUtils.createJsonRoute;

var getEventDistances = createJsonRoute(function getEventDistances(req, res) {
    var params = {
        id:              req.params.id,
        lat:             req.query.lat,
        long:            req.query.long,
        offset:          req.query.offset,
        limit:           req.query.limit
    };

    var serviceOpts = {};
    serviceOpts.includeAllFields = false;

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
