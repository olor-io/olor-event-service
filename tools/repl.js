#!/usr/bin/env node

// Project REPL for testing and convenience
var path = require('path');
var fs = require('fs');
var repl = require('repl');
var _ = require('lodash');
var moment = require('moment');

// Preloaded modules
console.log('Following modules are preloaded:');
console.log("  var lo = require('lodash')  (_ is reserved for repl)");
console.log("  var moment = require('moment')");
console.log("  var db = require('../src/database')");
console.log("  var knex = db.knex");
console.log("  var bookshelf = db.bookshelf");

// Load models
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

var models = {};
var modelsPath = path.join(__dirname, '../src/models');

fs.readdirSync(modelsPath).forEach(function(file) {
    console.log(file);
    if (/(.*)\.(js$|coffee$)/.test(file)) {
        var name = capitalize(file.split('-')[0]);
        console.log('  var ' + name + ' = require(\'' + file + '\')');

        models[name] = require(modelsPath + '/' + file);
    }
});

console.log('\n');

// Start REPL
var context = repl.start('> ').context;

// Configure what’s available in the REPL
context.util = require('util');
var db = require('../src/database').connect();
context.db = db;
context.knex = db.knex;
context.bookshelf = db.bookshelf;
context.lo = _;
context.moment = moment;

_.each(models, function(module, name) {
    context[name] = module;
});
