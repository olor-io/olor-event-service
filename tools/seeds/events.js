// Seed to generate predefined events from test-data folder or
// massive amounts of random events

var faker = require('faker');
var _ = require('lodash');
var modelUtils = require('../src/models/model-utils');
var seedData = require('../seed-data/minimal');

// Using strings since env vars are strings as well.
// ToDo: Adding env-vars as a possibility for controlling seeds.
var CREATE_EVENTS = 'true';
var RANDOM_EVENTS = 'false';
var EVENT_COUNT = 100;

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
    .then(function(eventIds) {
        var events = seedData.events;
        /*
        if (RANDOM_EVENTS === 'true') {
            events = _createRandomEvents(eventIds);
        } else {
            events = seedData.events;
        }
        */
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
    return Promise.reduce(events, function(memo, event, i) {
/*
        if (i % (events.length / REPORT_STEPS) === 0) {
            console.log(i + '/' + events.length, 'generated');
        }
*/
        var dbEvent = modelUtils.objectKeysToCase(event, 'snake')
        return knex('events').insert(dbEvent);
    }, 0);
}

/*
function _createRandomEvents(eventIds) {
    return _.map(_.times(EVENT_COUNT), function(memo, i) {
        var randomEventId = _randomChoice(eventIds);
        var newEvent = modelUtils.objectKeysToCase(
            _createRandomEvent(randomEventId),
            'snake'
        );

        return newEvent;
    });
}

function _createRandomEvent(eventId) {
    var createdAt = faker.date.past().toISOString();
    var event = {
        event: _randomInt(1, 5),
        createdAt: createdAt,
        updatedAt: createdAt,
        authorId: faker.random.uuid(),
        authorName: faker.name.findName(),
        authorRole: _randomChoice(['registered', 'anonymous']),
        replyRequested: _randomChoice([true, false]),
        moderated: _randomChoice([true, false]),
        published: _randomChoice([true, false]),
        // Foreign key to event
        eventId: eventId
    };

    if (_randomChoice([true, false])) {
        event.comment = _randomChoice([
            faker.lorem.sentences(),
            faker.lorem.paragraph()
        ]);
    }

    return event;
}

function _createRandomEvent() {
    var event = {
        externalId: faker.random.uuid(),
        namespace: _randomChoice(eventNamespaces),
        name: faker.company.companyName(),
        url: faker.image.imageUrl()
    };

    if (_trueWithProbability(90)) {
        var category = _randomChoice(_.keys(categories[event.namespace]));
        event.category = category;

        if (_trueWithProbability(95)) {
            var possibleSubs = categories[event.namespace][category];
            var subCategory = _randomChoice(possibleSubs);
            event.subCategory = subCategory;
        }
    }

    return event;
}

function _randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function _randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function _trueWithProbability(percent) {
    return _randomInt(1, 100) <= percent;
}
*/

exports.seed = seed;
