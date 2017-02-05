if (process.env.NODE_ENV === 'production') {
    // Use new relic only in production
    require('newrelic');
}

require('./setup-env-vars');

var express = require('express');
var http = require('http');
var cors = require('cors');
var errorhandler = require('errorhandler');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var compression = require('compression');
//var setupAuth = require('./setup-auth');
var gracefulExit = require('express-graceful-exit');
var logger = require('./logger')(__filename);
var Database = require('./database');
//var Redis = require('./redis');
var createRouter = require('./routes');
//var scheduler = require('./scheduler');

// Must be after setup-env-vars
var API_PREFIX = '/api/' + process.env.API_VERSION;

// Factory function to create instance of express application, eases testing
function startApp() {
    if (!process.env.DATABASE_URL) {
        logger.error('Environment variables not set!');
        logger.error('In local development, use command:');
        logger.error('\n    source .env\n');
        logger.error('before starting the server.');
        throw new Error('Missing environment variables');
    }

    var db = Database.connect();
    /*
    var redis = process.env.DISABLE_REDIS !== 'true'
                ? Redis.connect()
                : null;
    */
    var app = express();

    // Requests go through load balancer and req.ip is not correct if we don't
    // set this option. This trusts _all_ IP origins as a proxy
    // This is OK since we are behind Heroku's proxy
    // XXX: This needs to be reconsidered if environment changes
    app.enable('trust proxy');

    // Disable X-Powered-By header to prevent automatic scanners detecting
    // the framework
    app.disable('x-powered-by');

    if (process.env.SECURE_ENABLED) {
        app.use(function forceHttps(req, res, next) {
            if (req.secure) {
                // Allow requests only over https
                return next();
            }

            var err = new Error('Only HTTPS protocol is allowed.');
            err.status = 403;
            next(err);
        });
    }

    /*
    if (process.env.NODE_ENV === 'production' &&
        process.env.LOG_REQUESTS === 'true') {
        // Log requests on production only if env variable is set
        app.use(morgan('combined'));
    }

    if (process.env.NODE_ENV === 'test') {
        if (process.env.VERBOSE_TESTS === 'true') {
            app.use(morgan('  <- :method :url :status :response-time ms - :res[content-length]'));
        }
    }

    if (process.env.NODE_ENV === 'development') {
        // Pretty print JSON responses in development
        app.set('json spaces', 2);
        app.use(morgan('dev'));

        // Start running scheduled tasks
        scheduler.start({
            initialRun: true,
            initialRunDelay: 3000
        });
    }
    */

    // For API health monitoring
    // Specified before authentication so that new relic can ping it
    /*
    app.use(
        function monitor(req, res, next) {
            // /api/v1/health
            var healthUrl = API_PREFIX + '/health';
            if (req.url !== healthUrl) {
                return next();
            }

            // XXX: This is meant to be very simple check:
            // Is the app down or not?
            // Other errors, e.g. database errors, will be alerted from
            // increased error responses
            res.json({
                success: true
            });
        }
    );


    if (process.env.NODE_ENV === 'development' ||
        process.env.NODE_ENV === 'test') {
        // Disable caching for easier testing
        app.use(function noCache(req, res, next) {
            res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.header('Pragma', 'no-cache');
            res.header('Expires', 0);
            next();
        });

        // Emulate latency in local development
        if (process.env.API_LATENCY !== null) {
            logger.warn('Using API_LATENCY: ' + process.env.API_LATENCY);
            app.use(function(req, res, next) {
                if (req.path.indexOf('/api') !== -1) {
                    setTimeout(next, Number(process.env.API_LATENCY));
                } else {
                    next();
                }
            });
        }
    }


    var corsOpts = {
        origin: process.env.CORS_ORIGIN,
        credentials: true,
        exposedHeaders: ['x-total-count'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH']
    };
    logger.info('Using CORS options:', corsOpts);
    app.use(cors(corsOpts));
    */

    app.use(cookieParser());
    app.use(bodyParser.json());
    /*
    app.use(compression({
        // Compress everything over 10 bytes
        threshold: 10
    }));
    */
    // https://github.com/mathrawka/express-graceful-exit
    app.use(gracefulExit.middleware(app));

    // Setup authentication and passport
    //setupAuth(app, redis);

    // Initialize routes
    var router = createRouter();
    app.use(API_PREFIX, router);

    app.use(function convertValidationErrorToBadRequest(err, req, res, next) {
        if (err && err.name === 'ValidationError') {
            err.status = 400;
        }

        next(err, req, res, next);
    });

    /*
    if (process.env.NODE_ENV === 'test') {
        app.use(function(err, req, res, next) {
            // Log all internal server errors anyway
            if (err && (err.status === 500 || !err.status)) {
                logger.info(err.stack);
            } else if (process.env.VERBOSE_TESTS === 'true') {
                logger.info(err.stack);
            }

            next(err);
        });
    }
    */

    if (process.env.NODE_ENV !== 'test') {
        app.use(function errorLogger(err, req, res, next) {
            var status = err.status ? err.status : 500;
            var logMethod = status === 500 ? logger.error : logger.warn;

            // Skip unnecessary stack traces for Not Found requests
            if (status >= 400 && status !== 404) {
                // XXX: Should we remove secrets from logs?
                logMethod('Request headers:');
                logMethod(req.headers);
                logMethod('Request parameters:');
                logMethod(req.params);
                logMethod('Request body:');
                logMethod(req.body);
            }

            if (status === 500 || process.env.LOG_STACK_TRACES === 'true') {
                // Print stack traces only of internal server errors
                logMethod(err.stack);
            } else {
                logMethod(err.toString());
            }

            next(err);
        });
    }

    if (process.env.NODE_ENV === 'production') {
        // XXX: All errors thrown must not contain sensitive data in .message
        app.use(function errorResponder(err, req, res, next) {
            var message;
            var status = err.status ? err.status : 500;

            var httpMessage = http.STATUS_CODES[status];
            if (status < 500) {
                message = httpMessage + ': ' + err.message;
            } else {
                message = httpMessage;
            }

            res.status(status);
            res.send({ error: message });
        });
    } else {
        // This is not production safe error handler
        app.use(errorhandler());
    }

    // Start server
    var server = app.listen(process.env.PORT, function() {
        logger.info(
            'Express server listening on port %d in %s mode',
            process.env.PORT,
            app.get('env')
        );
        logger.info('-- NOTE: Logs may contain passwords and secrets! --');
    });

    function doExit() {
        gracefulExit.gracefulExitHandler(app, server, {
            log: true,
            logger: logger.info
        });
    }

    // Handle SIGTERM gracefully. Heroku will send this before idle.
    process.once('SIGTERM', function() {
        logger.info('SIGTERM received');
        logger.info('Closing http.Server ..');
        doExit();
    });

    // Handle Ctrl-c
    process.once('SIGINT', function() {
        logger.info('SIGINT(Ctrl-C) received');
        logger.info('Closing http.Server ..');
        doExit();
    });

    server.on('close', function() {
        logger.info('Received "close" event for http.Server');
        db.close();
        /*
        if (redis !== null) {
            redis.close();
        }
        */
    });

    return {
        app: app,
        server: server,
        db: db//,
        //redis: redis
    };
}

module.exports = startApp;
