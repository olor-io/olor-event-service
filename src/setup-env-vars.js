var _ = require('lodash');

// Use process.env as the only channel of input which can be given to the
// server application

// Set default node environment to development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.PORT = process.env.PORT || 80;

process.env.REDIS_URL = process.env.REDISTOGO_URL || process.env.REDIS_URL ||
    'redis://127.0.0.1:6379/';

// XXX: At this point REDIS_URL should be a full redis url
//      but it should _not_ contain database information
if (!_.endsWith(process.env.REDIS_URL, '/')) {
    // Ensure trailing slash
    process.env.REDIS_URL += '/';
}
// Explicitly use database index 0
process.env.REDIS_URL += '0';

// This is used in URLs
process.env.API_VERSION = 'v1';

// Must be set so that the frontend is able to do AJAX requests
//process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5000';

// Timeout in ms how long we delay with the processing
/*
process.env.API_LATENCY = process.env.API_LATENCY || null;

if (process.env.NODE_ENV === 'production' &&
    process.env.DISABLE_FORCE_SSL !== 'true'
) {
    process.env.SECURE_ENABLED === 'true';
}
*/
