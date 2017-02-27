// Database and ORM configuration
var Bookshelf = require('bookshelf');
var path = require('path');
var merge = require('lodash').merge;
var logger = require('./logger')(__filename);

var connection = process.env.DATABASE_URL + '?charset=utf-8';
if (process.env.NODE_ENV === 'production') {
    // Heroku postgres uses ssl
    connection += '&ssl=true';
}

var databaseConfig = {
    client: 'pg',
    connection: connection,
    pool: {
        min: 2,
        max: 10,
        ping: function pingDatabase(conn, cb) {
            conn.query('SELECT 1', cb);
        }
    },
    debug: process.env.DEBUG_DATABASE === 'true',
    migrations: {
        directory: path.join(__dirname, '../migrations'),
        tableName: 'migrations'
    },
    seeds: {
        directory: path.join(__dirname, '../tools/seeds')
    }
};

var knex = null;
var bookshelf = null;

// This function can be called as many times as needed but only
// on the first call, knex and bookshelf will be initialized
function connect() {
    if (knex === null && bookshelf === null) {
        knex = require('knex')(databaseConfig);
        bookshelf = Bookshelf(knex);
        bookshelf.plugin('registry');
    }

    function close(cb) {
        cb = cb || function() {};

        logger.info('Closing database connection ..');
        knex.destroy(function(err) {
            logger.info('Knex pool destroyed');
            cb(err);
        });
    }

    return {
        knex: knex,
        bookshelf: bookshelf,
        close: close,
        // Return config for convenience
        config: databaseConfig
    };
}

function logConfigWithoutPassword(config) {
    var configCopy = merge({}, config);
    configCopy.connection = censorPostgresConnectionString(configCopy.connection);
    console.log(configCopy);
    console.log('');
}

// Hides password from given postgres connection string.
// If postgres string is not detected, hides the whole string
function censorPostgresConnectionString(str) {
    var censored = 'CONNECTION STRING HIDDEN';
    if (!str) {
        return censored;
    }

    // The format is:
    // postgres://kesko:kesko@localhost:5432/kesko_mobile_scan
    var regex = /^(postgres):\/\/(.*):(.*)@(.*:[0-9]*\/.*)$/;
    if (str.match(regex) !== null) {
        // Hide password
        return str.replace(regex, '$1://$2:PASSWORD@$4');
    }

    return censored;
}

console.log('Using following knex config:');
logConfigWithoutPassword(databaseConfig);

module.exports = {
    connect: connect,
    config: databaseConfig
};
