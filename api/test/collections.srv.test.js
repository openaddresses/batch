import test from 'node:test';
import assert from 'assert';
import Flight from './flight.js';

const flight = new Flight();
flight.init();
flight.takeoff();

process.env.Bucket = 'v2.openaddresses.io';

test('POST: /api/collection', async () => {
    try {
        const res = await flight.fetch('/api/collections', {
            method: 'POST',
            headers: {
                'shared-secret': '123'
            },
            body: {
                name: 'global',
                sources: ['**']
            }
        }, true);

        assert.equal(res.body.id, 1);
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: /api/collection/2 - doesn\'t exist', async () => {
    try {
        const res = await flight.fetch('/api/collections/2', {
            headers: {
                'shared-secret': '123'
            }
        }, false);

        assert.deepEqual(res.body, {
            message: 'collections not found',
            messages: [],
            status: 404
        });
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: /api/collection', async () => {
    try {
        const res = await flight.fetch('/api/collections', {
            headers: {
                'shared-secret': '123'
            }
        }, true);

        assert.equal(res.body.length, 1);
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: /api/collection/1', async () => {
    try {
        const res = await flight.fetch('/api/collections/1', {
            headers: {
                'shared-secret': '123'
            }
        }, true);

        assert.equal(res.body.id, 1);
        assert.equal(res.body.name, 'global');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('PATCH: /api/collection/1', async () => {
    let date;
    try {
        const res = await flight.fetch('/api/collections/1', {
            headers: {
                'shared-secret': '123'
            }
        }, true);

        assert.equal(res.body.id, 1);
        assert.equal(res.body.name, 'global');
        date = res.body.created;
    } catch (err) {
        assert.ifError(err, 'no error');
    }

    try {
        const res = await flight.fetch('/api/collections/1', {
            method: 'PATCH',
            headers: {
                'shared-secret': '123'
            },
            body: {
                size: 123
            }
        }, true);

        assert.equal(res.body.id, 1);
        assert.equal(res.body.name, 'global');
        assert.equal(res.body.size, 123);

        assert.notEqual(date, res.body.created);
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('DELETE: /api/collection/2 - doesn\'t exist', async () => {
    try {
        const res = await flight.fetch('/api/collections/2', {
            method: 'DELETE',
            headers: {
                'shared-secret': '123'
            }
        }, true);

        assert.deepEqual(res.body, {
            message: 'Collection Deleted',
            status: 200
        });
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('DELETE: /api/collection/1', async () => {
    try {
        const res = await flight.fetch('/api/collections/1', {
            method: 'DELETE',
            headers: {
                'shared-secret': '123'
            }
        }, true);

        assert.deepEqual(res.body, {
            message: 'Collection Deleted',
            status: 200
        });
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: /api/collection', async () => {
    try {
        const res = await flight.fetch('/api/collections', {
            headers: {
                'shared-secret': '123'
            }
        }, false);

        assert.deepEqual(res.body, {
            status: 404,
            message: 'No collections found',
            messages: []
        });
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

flight.landing();
