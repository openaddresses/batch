import test from 'node:test';
import assert from 'assert';
import Flight from './flight.js';
import Collection from '../lib/collections.js';
import { Err } from '@openaddresses/batch-schema';

const flight = new Flight();
flight.init();
flight.takeoff();

process.env.Bucket = 'v2.openaddresses.io';

test('Collection()', () => {
    assert.throws(() => {
        new Collection();
    }, new Err(400, null, 'Collection.name must be a string'), 'Collection.name must be a string');

    assert.throws(() => {
        new Collection('');
    }, new Err(400, null, 'Collection.name cannot be empty'), 'Collection.name cannot be empty');

    assert.throws(() => {
        new Collection('*4d$');
    }, new Err(400, null, 'Collection.name may only contain a-z 0-9 and -'), 'Collection.name may only contain a-z 0-9 and -');

    assert.throws(() => {
        new Collection('global');
    }, new Err(400, null, 'Collection.sources must be an array'), 'Collection.sources must be an array');

    assert.throws(() => {
        new Collection('global', [true]);
    }, new Err(400, null, 'Collection.sources array must contain strings'), 'Collection.sources array must contain strings');

    const collection = new Collection(
        'global',
        ['**']
    );

    assert.equal(collection.id, false, 'collection.id: false');
    assert.equal(collection.name, 'global', 'collection.name: global');
    assert.deepEqual(collection.sources, ['**'], 'collection.sources:  ["**"]');
    assert.equal(collection.created, false, 'collection.created: false');
    assert.equal(collection.size, 0, 'collection.size: 0');
    assert.equal(collection.s3, false, 'collection.s3: false');
});

test('Collection#json()', () => {
    const collection = new Collection(
        'usa',
        ['us/**']
    );

    assert.equal(collection.id, false, 'collection.id: false');
    assert.equal(collection.name, 'usa', 'collection.name: usa');
    assert.deepEqual(collection.sources, ['us/**'], 'collection.sources:  ["us/**"]');
    assert.equal(collection.created, false, 'collection.created: false');
    assert.equal(collection.size, 0, 'collection.size: 0');
    assert.equal(collection.s3, false, 'collection.s3: false');

    assert.deepEqual(collection.json(), {
        id: NaN,
        name: 'usa',
        sources: ['us/**'],
        created: false,
        size: 0,
        s3: false
    });
});

test('Collection#patch()', () => {
    const collection = new Collection(
        'usa',
        ['us/**']
    );

    assert.equal(collection.id, false, 'collection.id: false');
    assert.equal(collection.name, 'usa', 'collection.name: use');
    assert.deepEqual(collection.sources, ['us/**'], 'collection.sources:  ["us/**"]');
    assert.equal(collection.created, false, 'collection.created: false');
    assert.equal(collection.size, 0, 'collection.size: 0');
    assert.equal(collection.s3, false, 'collection.s3: false');

    collection.patch({
        name: 'global',
        sources: ['**'],
        size: 123
    });

    // Cannot be changed
    assert.equal(collection.id, false, 'collection.id: false');
    assert.equal(collection.s3, false, 'collection.s3: false');

    // Can be changed
    assert.equal(collection.name, 'global', 'collection.name: global');
    assert.deepEqual(collection.sources, ['**'], 'collection.sources:  ["**"]');
    assert.equal(collection.created, false, 'collection.created: false');
    assert.equal(collection.size, 123, 'collection.size: 123');
});

test('Collection#generate()', async () => {
    try {
        const collection = new Collection(
            'usa',
            ['us/**']
        );

        await collection.generate(flight.config.pool);
        assert.equal(collection.id, 1, 'collection.id: 1');
        assert.equal(collection.name, 'usa', 'collection.name: use');
        assert.deepEqual(collection.sources, ['us/**'], 'collection.sources:  ["us/**"]');
        assert.ok(collection.created, 'collection.created: <data>');
        assert.equal(collection.size, 0, 'collection.size: 0');
        assert.equal(collection.s3, 's3://v2.openaddresses.io/test/collection-usa.zip', 'collection.s3: s3://v2.openaddresses.io/test/collection-usa.zip');
    } catch (err) {
        assert.ifError(err, 'no errors');
    }

    try {
        const collection = new Collection(
            'usa',
            ['us/**']
        );

        await collection.generate(flight.config.pool);

        assert.fail('duplicate collections should fail');
    } catch (err) {
        assert.deepEqual(err, new Err(400, null, 'duplicate collections not allowed'));
    }
});

test('Collection#list', async () => {
    try {
        const list = await Collection.list(flight.config.pool);

        assert.equal(list.length, 1, 'list.length: 1');

        assert.ok(list[0].created, 'list[0].created: <date>');
        delete list[0].created;

        assert.deepEqual(list[0], {
            id: 1,
            name: 'usa',
            sources: ['us/**'],
            size: 0,
            s3: 's3://v2.openaddresses.io/test/collection-usa.zip'
        }, 'list[0]: <object>');
    } catch (err) {
        assert.ifError(err, 'no errors');
    }
});

test('Collection#data', async () => {
    try {
        let param = false;

        await Collection.data(flight.config.pool, 1, {
            redirect: (p) => {
                param = p;
            }
        });

        assert.equal(param, 'https://v2.openaddresses.io/test/collection-usa.zip', 'html data url');
    } catch (err) {
        assert.ifError(err, 'no errors');
    }

    try {
        let param = false;

        await Collection.data(flight.config.pool, 2, {
            redirect: (p) => {
                param = p;
            }
        });

        assert.equal(param, 'https://v2.openaddresses.io/test/collection-usa.zip', 'html data url');

        assert.fail('collection should not be found');
    } catch (err) {
        assert.deepEqual(err, new Err(404, null, 'collection not found'));
    }
});

test('Collection#from()', async () => {
    try {
        const collection = await Collection.from(flight.config.pool, 1);

        assert.equal(collection.id, 1, 'collection.id: 1');
        assert.equal(collection.name, 'usa', 'collection.name: use');
        assert.deepEqual(collection.sources, ['us/**'], 'collection.sources:  ["us/**"]');
        assert.ok(collection.created, 'collection.created: <date>');
        assert.equal(collection.size, 0, 'collection.size: 0');
        assert.equal(collection.s3, 's3://v2.openaddresses.io/test/collection-usa.zip', 'collection.s3: <s3 path>');

    } catch (err) {
        assert.ifError(err, 'no errors');
    }

    try {
        await Collection.from(flight.config.pool, 2);

        assert.fail('collection should not be found');
    } catch (err) {
        assert.deepEqual(err, new Err(404, null, 'collection not found'));
    }
});

test('Collection#commit()', async () => {
    try {
        const collection = new Collection(
            'global',
            ['wrong']
        );

        await collection.generate(flight.config.pool);
    } catch (err) {
        assert.ifError(err, 'no errors');
    }

    try {
        const collection = await Collection.from(flight.config.pool, 3);

        collection.patch({
            size: 1234,
            sources: ['**']
        });

        await collection.commit(flight.config.pool);
    } catch (err) {
        assert.ifError(err, 'no errors');
    }

    try {
        const collection = await Collection.from(flight.config.pool, 3);

        await collection.commit(flight.config.pool);

        assert.equal(collection.id, 3, 'collection.id: 1');
        assert.equal(collection.name, 'global', 'collection.name: use');
        assert.deepEqual(collection.sources, ['**'], 'collection.sources:  ["us/**"]');
        assert.ok(collection.created, 'collection.created: <date>');
        assert.equal(collection.size, 1234, 'collection.size: 0');
        assert.equal(collection.s3, 's3://v2.openaddresses.io/test/collection-global.zip', 'collection.s3: <s3 path>');
    } catch (err) {
        assert.ifError(err, 'no errors');
    }
});

test('Collection#delete()', async () => {
    try {
        await Collection.delete(flight.config.pool, 3);
    } catch (err) {
        assert.ifError(err, 'no errors');
    }

    try {
        const list = await Collection.list(flight.config.pool);

        assert.equal(list.length, 1, 'list.length: 1');

        assert.ok(list[0].created, 'list[0].created: <date>');
        delete list[0].created;

        assert.deepEqual(list[0], {
            id: 1,
            name: 'usa',
            sources: ['us/**'],
            size: 0,
            s3: 's3://v2.openaddresses.io/test/collection-usa.zip'
        }, 'list[0]: <object>');
    } catch (err) {
        assert.ifError(err, 'no errors');
    }
});

flight.landing();
