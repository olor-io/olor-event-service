// Central redis instance
// Note: redis might be disabled with env variable! Then this module returns
// null

var Redis = require('ioredis');
var logger = require('./logger')(__filename);

var redis = null;
// This function can be called as many times as needed but only
// on the first call, redis will be initialized
function connect() {
    if (redis === null && process.env.DISABLE_REDIS !== 'true') {
        if (!process.env.REDIS_URL) {
            throw new Error('REDIS_URL is not set!');
        }

        redis = new Redis(process.env.REDIS_URL, {
            retryStrategy: function(times) {
                // Make reconnecting a bit more relaxed compared to default
                var delay = Math.min(times * 100, 4000);
                return delay;
            }
        });

        // Inject .close method to redis, a bit bad practice but convenient
        redis.close = function close(cb) {
            _close(redis, cb);
        };

        redis.on('error', function(err) {
            logger.error('Error occured with redis:');
            logger.error(err);
        });

        redis.on('ready', function() {
            logger.info('Connected to redis.');
        });
    }

    return redis;
}

function _close(redisInstance, cb) {
    cb = cb || function() {};

    logger.info('Closing redis connection ..');
    redisInstance.disconnect(function(err) {
        logger.info('Redis connection closed.');
        cb(err);
    });
}

module.exports = {
    connect: connect
};
