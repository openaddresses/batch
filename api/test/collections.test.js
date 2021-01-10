'use strict';

const { Pool } = require('pg');
const test = require('tape');

const Collection = require('../lib/collections');
const { init } = require('./init');
const Err = require('../lib/error');

init(test);

test('Collecton()', (t) => {
    t.throws(() => {
        new Collection();
    }, new Err(400, null, 'Collection.name must be a string'), 'Collection.name must be a string');

    t.throws(() => {
        new Collection('');
    }, new Err(400, null, 'Collection.name cannot be empty'), 'Collection.name cannot be empty');

    t.throws(() => {
        new Collection('*4d$');
    }, new Err(400, null, 'Collection.name may only contain a-z 0-9 and -'), 'Collection.name may only contain a-z 0-9 and -');

    t.throws(() => {
        new Collection('global');
    }, new Err(400, null, 'Collection.sources must be an array'), 'Collection.sources must be an array');

    t.throws(() => {
        new Collection('global', []);
    }, new Err(400, null, 'Collection.sources must be > 0'), 'Collection.sources must be > 0');

    t.throws(() => {
        new Collection('global', [ true ]);
    }, new Err(400, null, 'Collection.sources array must contain strings'), 'Collection.sources array must contain strings');

    const collection = new Collection(
        'global',
        ['**']
    );

    t.equals(collection.id, false, 'collection.id: false');
    t.equals(collection.name, 'global', 'collection.name: global');
    t.deepEquals(collection.sources, [ '**' ], 'collection.sources:  ["**"]');
    t.equals(collection.created, false, 'collection.created: false');
    t.equals(collection.size, 0, 'collection.size: 0');
    t.equals(collection.s3, false, 'collection.s3: false');

    t.end();
});

test('Collection#json()', (t) => {
    const collection = new Collection(
        'usa',
        ['us/**']
    );

    t.equals(collection.id, false, 'collection.id: false');
    t.equals(collection.name, 'usa', 'collection.name: global');
    t.deepEquals(collection.sources, [ 'us/**' ], 'collection.sources:  ["**"]');
    t.equals(collection.created, false, 'collection.created: false');
    t.equals(collection.size, 0, 'collection.size: 0');
    t.equals(collection.s3, false, 'collection.s3: false');

    t.deepEquals(collection.json(), {
        id: NaN,
        name: 'usa',
        sources: ['us/**'],
        created: false,
        size: 0,
        s3: false
    });

    t.end();
});

