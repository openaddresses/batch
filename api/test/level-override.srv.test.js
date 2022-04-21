import test from 'node:test';
import assert from 'assert';
import Flight from './flight.js';

const flight = new Flight();

flight.init();
flight.takeoff();
flight.user('admin', true);

test('POST: api/level', async (t) => {
    try {
        const res = await flight.fetch('/api/level', {
            method: 'POST',
            auth: {
                bearer: flight.token.admin
            },
            body: {
                pattern: '/^hello@openaddresses.io$/',
                level: 'sponsor'
            }
        }, true);

        assert.ok(res.body.created);
        delete res.body.created;
        assert.ok(res.body.updated);
        delete res.body.updated;

        assert.deepEqual(res.body, {
            id: 1,
            pattern: '/^hello@openaddresses.io$/',
            level: 'sponsor'
        });
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('POST: api/level', async (t) => {
    try {
        const res = await flight.fetch('/api/level', {
            method: 'POST',
            auth: {
                bearer: flight.token.admin
            },
            body: {
                pattern: '/^.*@example.com$/',
                level: 'sponsor'
            }
        }, true);

        assert.ok(res.body.created);
        delete res.body.created;
        assert.ok(res.body.updated);
        delete res.body.updated;

        assert.deepEqual(res.body, {
            id: 2,
            pattern: '/^.*@example.com$/',
            level: 'sponsor'
        });
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('PATCH: api/level/2', async (t) => {
    try {
        const res = await flight.fetch('/api/level/2', {
            method: 'PATCH',
            json: true,
            auth: {
                bearer: flight.token.admin
            },
            body: {
                level: 'backer'
            }
        }, true);

        assert.ok(res.body.created);
        delete res.body.created;
        assert.ok(res.body.updated);
        delete res.body.updated;

        assert.deepEqual(res.body, {
            id: 2,
            pattern: '/^.*@example.com$/',
            level: 'backer'
        });
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: api/level/2', async (t) => {
    try {
        const res = await flight.fetch('/api/level/2', {
            auth: {
                bearer: flight.token.admin
            }
        }, true);

        assert.ok(res.body.created);
        delete res.body.created;
        assert.ok(res.body.updated);
        delete res.body.updated;

        assert.deepEqual(res.body, {
            id: 2,
            pattern: '/^.*@example.com$/',
            level: 'backer'
        });
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: api/level/1', async (t) => {
    try {
        const res = await flight.fetch('/api/level/1', {
            auth: {
                bearer: flight.token.admin
            }
        }, true);

        assert.ok(res.body.created);
        delete res.body.created;
        assert.ok(res.body.updated);
        delete res.body.updated;

        assert.deepEqual(res.body, {
            id: 1,
            pattern: '/^hello@openaddresses.io$/',
            level: 'sponsor'
        });
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('DELETE: api/level/2', async (t) => {
    try {
        const res = await flight.fetch('/api/level/2', {
            method: 'DELETE',
            auth: {
                bearer: flight.token.admin
            }
        }, true);

        assert.deepEqual(res.body, {
            status: 200,
            message: 'Delete Level Override'

        });
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: api/level/2', async (t) => {
    try {
        const res = await flight.fetch('/api/level/2', {
            auth: {
                bearer: flight.token.admin
            }
        }, false);

        assert.deepEqual(res.body, {
            status: 404,
            message: 'level_override not found',
            messages: []
        });
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: api/level', async (t) => {
    try {
        const res = await flight.fetch('/api/level', {
            auth: {
                bearer: flight.token.admin
            }
        }, true);

        delete res.body.level_override[0].created;
        delete res.body.level_override[0].updated;

        assert.deepEqual(res.body, {
            total: 1,
            level_override: [{
                id: 1,
                level: 'sponsor',
                pattern: '/^hello@openaddresses.io$/'
            }]
        });
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

flight.landing();
