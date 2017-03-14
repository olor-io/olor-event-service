// Seed to generate predefined user users from test-data folder or
// massive amounts of random users

var faker = require('faker');
var _ = require('lodash');
var modelUtils = require('../../src/models/model-utils');
var seedData = require('../seed-data/users');
var users = seedData.users;

// Using strings since env vars are strings as well.
// ToDo: Adding env-vars as a possibility for controlling seeds.
var CREATE_USERS = 'true';
var RANDOM_USERS = 'false';

function seed(knex, Promise) {
    console.log('\n');
    if (CREATE_USERS !== 'true') {
        console.log('Skipping user user creation..');
        console.log('Set CREATE_USERS=true to create users');
        return Promise.resolve(true);
    }

    console.log('Inserting', users.length, 'users ..');

    // Deletes ALL existing users
    return _deleteAll(knex, Promise)
    .then(function() {
        return _insertUsers(knex, Promise, users);
    })
    .then(function() {
        console.log('All users inserted.');
    });
}

function _deleteAll(knex, Promise) {
    return Promise.join(
        knex('users').del()
    );
}

function _insertUsers(knex, Promise, users) {
    return Promise.reduce(users, function(memo, user) {
        var dbUser = modelUtils.objectKeysToCase(user, 'snake')
        return knex('users').insert(dbUser);
    }, 0);
}

exports.seed = seed;
