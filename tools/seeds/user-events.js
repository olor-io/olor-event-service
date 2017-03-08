// Seed to generate predefined user user events from test-data folder or
// massive amounts of random user events

var faker = require('faker');
var _ = require('lodash');
var modelUtils = require('../../src/models/model-utils');
var seedData = require('../seed-data/user-events');
var userEvents = seedData.userEvents;

// Using strings since env vars are strings as well.
// ToDo: Adding env-vars as a possibility for controlling seeds.
var CREATE_USER_EVENTS = 'true';
var RANDOM_EVENTS = 'false';

function seed(knex, Promise) {
    console.log('\n');
    if (CREATE_USER_EVENTS !== 'true') {
        console.log('Skipping user events creation..');
        console.log('Set CREATE_USER_EVENTS=true to create user_events');
        return Promise.resolve(true);
    }

    console.log('Inserting', userEvents.length, 'user events ..');

    // Deletes ALL existing user_events
    return _deleteAll(knex, Promise)
    .then(function() {
        return _insertEvents(knex, Promise, userEvents);
    })
    .then(function() {
        console.log('All user events inserted.');
    });
}

function _deleteAll(knex, Promise) {
    return Promise.join(
        knex('user_events').del()
    );
}

function _insertEvents(knex, Promise, userEvents) {
    return Promise.reduce(userEvents, function(memo, userEvent) {
        var dbEvent = modelUtils.objectKeysToCase(userEvent, 'snake')
        return knex('user_events').insert(dbEvent);
    }, 0);
}

exports.seed = seed;
