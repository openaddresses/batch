'use strict';

const test = require('tape');

const { Pool } = require('pg');
const Collection = require('../lib/collections');
const Flight = require('./init');
const Err = require('../lib/error');

const flight = new Flight();
flight.init(test);

process.env.Bucket = 'v2.openaddresses.io';

test('Collection()', (t) => {
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
        new Collection('global', [true]);
    }, new Err(400, null, 'Collection.sources array must contain strings'), 'Collection.sources array must contain strings');

    const collection = new Collection(
        'global',
        ['**']
    );

    t.equals(collection.id, false, 'collection.id: false');
    t.equals(collection.name, 'global', 'collection.name: global');
    t.deepEquals(collection.sources, ['**'], 'collection.sources:  ["**"]');
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
    t.equals(collection.name, 'usa', 'collection.name: usa');
    t.deepEquals(collection.sources, ['us/**'], 'collection.sources:  ["us/**"]');
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

test('Collection#patch()', (t) => {
    const collection = new Collection(
        'usa',
        ['us/**']
    );

    t.equals(collection.id, false, 'collection.id: false');
    t.equals(collection.name, 'usa', 'collection.name: use');
    t.deepEquals(collection.sources, ['us/**'], 'collection.sources:  ["us/**"]');
    t.equals(collection.created, false, 'collection.created: false');
    t.equals(collection.size, 0, 'collection.size: 0');
    t.equals(collection.s3, false, 'collection.s3: false');

    collection.patch({
        name: 'global',
        sources: ['**'],
        size: 123
    });

    // Cannot be changed
    t.equals(collection.id, false, 'collection.id: false');
    t.equals(collection.s3, false, 'collection.s3: false');

    // Can be changed
    t.equals(collection.name, 'global', 'collection.name: global');
    t.deepEquals(collection.sources, ['**'], 'collection.sources:  ["**"]');
    t.equals(collection.created, false, 'collection.created: false');
    t.equals(collection.size, 123, 'collection.size: 123');

    t.end();
});

test('Collection#generate()', async (t) => {
    const pool = new Pool({
        connectionString: 'postgres://postgres@localhost:5432/openaddresses_test'
    });

    try {
        const collection = new Collection(
            'usa',
            ['us/**']
        );

        await collection.generate(pool);
        t.equals(collection.id, 1, 'collection.id: 1');
        t.equals(collection.name, 'usa', 'collection.name: use');
        t.deepEquals(collection.sources, ['us/**'], 'collection.sources:  ["us/**"]');
        t.ok(collection.created, 'collection.created: <data>');
        t.equals(collection.size, 0, 'collection.size: 0');
        t.equals(collection.s3, 's3://v2.openaddresses.io/test/collection-usa.zip', 'collection.s3: s3://v2.openaddresses.io/test/collection-usa.zip');
    } catch (err) {
        t.error(err, 'no errors');
    }

    try {
        const collection = new Collection(
            'usa',
            ['us/**']
        );

        await collection.generate(pool);

        t.fail('duplicate collections should fail');
    } catch (err) {
        t.deepEquals(err, new Err(400, null, 'duplicate collections not allowed'));
    }

    pool.end();
    t.end();
});

test('Collection#list', async (t) => {
    const pool = new Pool({
        connectionString: 'postgres://postgres@localhost:5432/openaddresses_test'
    });

    try {
        const list = await Collection.list(pool);

        t.equals(list.length, 1, 'list.length: 1');

        t.ok(list[0].created, 'list[0].created: <date>');
        delete list[0].created;

        t.same(list[0], {
            id: 1,
            name: 'usa',
            sources: ['us/**'],
            size: 0,
            s3: 's3://v2.openaddresses.io/test/collection-usa.zip'
        }, 'list[0]: <object>');
    } catch (err) {
        t.error(err, 'no errors');
    }

    pool.end();
    t.end();
});

test('Collection#data', async (t) => {
    const pool = new Pool({
        connectionString: 'postgres://postgres@localhost:5432/openaddresses_test'
    });

    try {
        let param = false;

        await Collection.data(pool, 1, {
            redirect: (p) => {
                param = p;
            }
        });

        t.equals(param, 'https://v2.openaddresses.io/test/collection-usa.zip', 'html data url');
    } catch (err) {
        t.error(err, 'no errors');
    }

    try {
        let param = false;

        await Collection.data(pool, 2, {
            redirect: (p) => {
                param = p;
            }
        });

        t.equals(param, 'https://v2.openaddresses.io/test/collection-usa.zip', 'html data url');

        t.fail('collection should not be found');
    } catch (err) {
        t.deepEquals(err, new Err(404, null, 'collection not found'));
    }

    pool.end();
    t.end();
});

test('Collection#from()', async (t) => {
    const pool = new Pool({
        connectionString: 'postgres://postgres@localhost:5432/openaddresses_test'
    });

    try {
        const collection = await Collection.from(pool, 1);

        t.equals(collection.id, 1, 'collection.id: 1');
        t.equals(collection.name, 'usa', 'collection.name: use');
        t.deepEquals(collection.sources, ['us/**'], 'collection.sources:  ["us/**"]');
        t.ok(collection.created, 'collection.created: <date>');
        t.equals(collection.size, 0, 'collection.size: 0');
        t.equals(collection.s3, 's3://v2.openaddresses.io/test/collection-usa.zip', 'collection.s3: <s3 path>');

    } catch (err) {
        t.error(err, 'no errors');
    }

    try {
        await Collection.from(pool, 2);

        t.fail('collection should not be found');
    } catch (err) {
        t.deepEquals(err, new Err(404, null, 'collection not found'));
    }

    pool.end();
    t.end();
});

test('Collection#commit()', async (t) => {
    const pool = new Pool({
        connectionString: 'postgres://postgres@localhost:5432/openaddresses_test'
    });

    try {
        const collection = new Collection(
            'global',
            ['wrong']
        );

        await collection.generate(pool);
    } catch (err) {
        t.error(err, 'no errors');
    }

    try {
        const collection = await Collection.from(pool, 3);

        collection.patch({
            size: 1234,
            sources: ['**']
        });

        await collection.commit(pool);
    } catch (err) {
        t.error(err, 'no errors');
    }

    try {
        const collection = await Collection.from(pool, 3);

        await collection.commit(pool);

        t.equals(collection.id, 3, 'collection.id: 1');
        t.equals(collection.name, 'global', 'collection.name: use');
        t.deepEquals(collection.sources, ['**'], 'collection.sources:  ["us/**"]');
        t.ok(collection.created, 'collection.created: <date>');
        t.equals(collection.size, 1234, 'collection.size: 0');
        t.equals(collection.s3, 's3://v2.openaddresses.io/test/collection-global.zip', 'collection.s3: <s3 path>');
    } catch (err) {
        t.error(err, 'no errors');
    }

    pool.end();
    t.end();
});

test('Collection#delete()', async (t) => {
    const pool = new Pool({
        connectionString: 'postgres://postgres@localhost:5432/openaddresses_test'
    });

    try {
        await Collection.delete(pool, 3);
    } catch (err) {
        t.error(err, 'no errors');
    }

    try {
        const list = await Collection.list(pool);

        t.equals(list.length, 1, 'list.length: 1');

        t.ok(list[0].created, 'list[0].created: <date>');
        delete list[0].created;

        t.same(list[0], {
            id: 1,
            name: 'usa',
            sources: ['us/**'],
            size: 0,
            s3: 's3://v2.openaddresses.io/test/collection-usa.zip'
        }, 'list[0]: <object>');
    } catch (err) {
        t.error(err, 'no errors');
    }

    pool.end();
    t.end();
});
