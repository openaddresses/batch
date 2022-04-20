import test from 'tape';
import Flight from './flight.mjs';

const flight = new Flight();

flight.init(test);
flight.takeoff(test);
flight.user(test, 'admin', true);

test('POST: api/level', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/level',
            method: 'POST',
            json: true,
            auth: {
                bearer: flight.token.admin
            },
            body: {
                pattern: '/^hello@openaddresses.io$/',
                level: 'sponsor'
            }
        }, t);

        t.ok(res.body.created);
        delete res.body.created;
        t.ok(res.body.updated);
        delete res.body.updated;

        t.deepEquals(res.body, {
            id: 1,
            pattern: '/^hello@openaddresses.io$/',
            level: 'sponsor'
        });
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('POST: api/level', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/level',
            method: 'POST',
            json: true,
            auth: {
                bearer: flight.token.admin
            },
            body: {
                pattern: '/^.*@example.com$/',
                level: 'sponsor'
            }
        }, t);

        t.ok(res.body.created);
        delete res.body.created;
        t.ok(res.body.updated);
        delete res.body.updated;

        t.deepEquals(res.body, {
            id: 2,
            pattern: '/^.*@example.com$/',
            level: 'sponsor'
        });
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('PATCH: api/level/2', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/level/2',
            method: 'PATCH',
            json: true,
            auth: {
                bearer: flight.token.admin
            },
            body: {
                level: 'backer'
            }
        }, t);

        t.ok(res.body.created);
        delete res.body.created;
        t.ok(res.body.updated);
        delete res.body.updated;

        t.deepEquals(res.body, {
            id: 2,
            pattern: '/^.*@example.com$/',
            level: 'backer'
        });
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET: api/level/2', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/level/2',
            json: true,
            auth: {
                bearer: flight.token.admin
            }
        }, t);

        t.ok(res.body.created);
        delete res.body.created;
        t.ok(res.body.updated);
        delete res.body.updated;

        t.deepEquals(res.body, {
            id: 2,
            pattern: '/^.*@example.com$/',
            level: 'backer'
        });
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET: api/level/1', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/level/1',
            json: true,
            auth: {
                bearer: flight.token.admin
            }
        }, t);

        t.ok(res.body.created);
        delete res.body.created;
        t.ok(res.body.updated);
        delete res.body.updated;

        t.deepEquals(res.body, {
            id: 1,
            pattern: '/^hello@openaddresses.io$/',
            level: 'sponsor'
        });
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('DELETE: api/level/2', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/level/2',
            json: true,
            method: 'DELETE',
            auth: {
                bearer: flight.token.admin
            }
        }, t);

        t.deepEquals(res.body, {
            status: 200,
            message: 'Delete Level Override'

        });
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET: api/level/2', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/level/2',
            json: true,
            auth: {
                bearer: flight.token.admin
            }
        }, false);

        t.deepEquals(res.body, {
            status: 404,
            message: 'level_override not found',
            messages: []
        });
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET: api/level', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/level',
            json: true,
            auth: {
                bearer: flight.token.admin
            }
        }, t);

        delete res.body.level_override[0].created;
        delete res.body.level_override[0].updated;

        t.deepEquals(res.body, {
            total: 1,
            level_override: [{
                id: 1,
                level: 'sponsor',
                pattern: '/^hello@openaddresses.io$/'
            }]
        });
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

flight.landing(test);
