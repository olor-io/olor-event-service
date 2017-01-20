// Central logging module
// Always use this to init a new logger

var path = require('path');
var winston = require('winston');
var _ = require('lodash');

function setLevel(logger, level) {
    _.each(logger.transports, function(transport) {
        transport.level = level;
    });
}

function createLogger(filePath) {
    var logger = new winston.Logger({
        transports: [new winston.transports.Console({
            label: path.basename(filePath),
            timestamp: true,
            colorize: process.env.NODE_ENV === 'development'
        })]
    });

    setLevel(logger, process.env.LOG_LEVEL || 'info');
    return logger;
}

module.exports = createLogger;
