import test from 'node:test';
import assert from 'assert';
import Flight from './flight.js';

const flight = new Flight();
flight.init();
flight.takeoff();

flight.user('sponsor', false, {
    level: 'sponsor'
});

flight.user('sponsor2', false, {
    level: 'sponsor'
});

let token;

test('GET /api/token', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/token',
            method: 'GET',
            json: true,
            auth: {
                bearer: flight.token.sponsor
            }
        }, t);

        assert.deepEqual(res.body, {
            total: 0,
            tokens: []
        });
    } catch (err) {
        assert.ifError(err, 'no errors');
    }
});

test('POST /api/token', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/token',
            method: 'POST',
            json: true,
            auth: {
                bearer: flight.token.sponsor
            },
            body: {
                name: 'Default Token'
            }
        }, t);

        assert.ok(res.body.token);
        token = res.body.token;
        delete res.body.token;

        assert.ok(res.body.created);
        delete res.body.created;

        assert.deepEqual(res.body, {
            id: 1,
            name: 'Default Token'
        });
    } catch (err) {
        assert.ifError(err, 'no errors');
    }
});

test('POST /api/token (sponsor2)', async (t) => {
    try {
        await flight.request({
            url: '/api/token',
            method: 'POST',
            json: true,
            auth: {
                bearer: flight.token.sponsor2
            },
            body: {
                name: 'Default Token'
            }
        }, t);
    } catch (err) {
        assert.ifError(err, 'no errors');
    }
});

test('GET /api/token', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/token',
            method: 'GET',
            json: true,
            auth: {
                bearer: token
            }
        }, t);


        delete res.body.tokens[0].created;

        assert.deepEqual(res.body, {
            total: 1,
            tokens: [{
                id: 1,
                name: 'Default Token'
            }]
        });
    } catch (err) {
        assert.ifError(err, 'no errors');
    }
});

test('DELETE /api/token/2 - Can only delete own tokens', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/token/2',
            method: 'DELETE',
            json: true,
            auth: {
                bearer: token
            }
        }, false);

        assert.equal(res.status, 401);
        assert.deepEqual(res.body, {
            status: 401,
            message: 'You can only access your own tokens',
            messages: []
        });
    } catch (err) {
        assert.ifError(err, 'no errors');
    }
});

test('DELETE /api/token/1', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/token/1',
            method: 'DELETE',
            json: true,
            auth: {
                bearer: token
            }
        }, t);


        assert.deepEqual(res.body, {
            status: 200,
            message: 'Token Deleted'
        });
    } catch (err) {
        assert.ifError(err, 'no errors');
    }
});

test('GET /api/token - verify token was deleted', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/token',
            method: 'GET',
            json: true,
            auth: {
                bearer: token
            }
        }, false);

        assert.equal(res.status, 401);
        assert.deepEqual(res.body, {
            status: 401,
            message: 'Invalid token',
            messages: []
        });
    } catch (err) {
        assert.ifError(err, 'no errors');
    }
});

flight.landing();
