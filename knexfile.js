// Everything required here must be in dependencies, not devDependencies
// because this file is also run in production environment
var config = require('./src/database').config;

// All possible NODE_ENVs should be listed here
// This is issue with knex
// See https://github.com/tgriesser/knex/issues/328
var envs = {
    development: config,
    test: config,
    production: config
};

if (!envs.hasOwnProperty(process.env.NODE_ENV)) {
    console.error('NODE_ENV is not set!');
    console.error('Set NODE_ENV manually, or running e.g. source .env');
    console.error('\n');
    throw new Error('Environment is not set');
}

module.exports = envs;
