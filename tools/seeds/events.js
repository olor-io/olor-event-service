// Seed to generate predefined events from test-data folder or
// massive amounts of random events


var faker = require('faker');
var _ = require('lodash');
var modelUtils = require('../../src/models/model-utils');
var seedData = require('../seed-data/events');
var events = seedData.events;

// Using strings since env vars are strings as well.
// ToDo: Adding env-vars as a possibility for controlling seeds.
var CREATE_EVENTS = 'true';
var RANDOM_EVENTS = 'false';

function seed(knex, Promise) {
    console.log('\n');
    if (CREATE_EVENTS !== 'true') {
        console.log('Skipping events creation..');
        console.log('Set CREATE_EVENTS=true to create events');
        return Promise.resolve(true);
    }

    console.log('Inserting', events.length, 'events ..');

    // Deletes ALL existing events
    return _deleteAll(knex, Promise)
    .then(function() {
        return _insertEvents(knex, Promise, events);
    })
    .then(function() {
        console.log('All events inserted.');
    });
}

function _deleteAll(knex, Promise) {
    return Promise.join(
        knex('events').del()
    );
}

function _insertEvents(knex, Promise, events) {
    return Promise.reduce(events, function(memo, event_) {
        var dbEvent = modelUtils.objectKeysToCase(event_, 'snake')
        return knex('events').insert(dbEvent);
    }, 0);
}

exports.seed = seed;
