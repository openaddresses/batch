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

test('GET: /api/collection - sponsor sees both s3 links', async () => {
    try {
        // The shared-secret auth path is level: 'sponsor'.
        const res = await flight.fetch('/api/collections', {
            headers: {
                'shared-secret': '123'
            }
        }, true);

        assert.equal(res.body.length, 1);
        assert.equal(res.body[0].s3, 's3://v2.openaddresses.io/test/collection-global.zip');
        assert.equal(res.body[0].processed_s3, 's3://v2.openaddresses.io/test/collection-global-processed.zip');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: /api/collection - unauthenticated response strips s3 and processed_s3', async () => {
    try {
        // Schema validation is disabled here: res.ListCollections.json marks
        // `s3` required, which only holds for the sponsor view.
        const res = await flight.fetch('/api/collections', {}, false);

        assert.equal(res.body.length, 1);
        assert.equal(res.body[0].name, 'global');
        assert.ok(!('s3' in res.body[0]), 's3 is not exposed to non-sponsors');
        assert.ok(!('processed_s3' in res.body[0]), 'processed_s3 is gated by the same sponsor-only rule as s3');
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

test('PATCH: /api/collection/1 sets processed_size', async () => {
    try {
        const res = await flight.fetch('/api/collections/1', {
            method: 'PATCH',
            headers: {
                'shared-secret': '123'
            },
            body: {
                processed_size: 456
            }
        }, true);

        assert.equal(res.body.id, 1);
        assert.equal(res.body.processed_size, 456);
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: /api/collection/1/processed - redirects to the processed zip', async () => {
    try {
        const res = await flight.fetch('/api/collections/1/processed', {
            headers: {
                'shared-secret': '123'
            },
            redirect: 'manual'
        }, { verify: false, json: false });

        assert.equal(res.status, 302);
        assert.equal(res.headers.get('location'), 'https://v2.openaddresses.io/test/collection-global-processed.zip');
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
