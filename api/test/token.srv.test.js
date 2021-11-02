const test = require('tape');

const Flight = require('./flight');

const flight = new Flight();
flight.init(test);
flight.takeoff(test);

flight.user(test, 'sponsor', false, {
    level: 'sponsor'
});

flight.user(test, 'sponsor2', false, {
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

        t.deepEquals(res.body, {
            total: 0,
            tokens: []
        });
    } catch (err) {
        t.error(err, 'no errors');
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

        t.ok(res.body.token);
        token = res.body.token;
        delete res.body.token;

        t.ok(res.body.created);
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            name: 'Default Token'
        });
    } catch (err) {
        t.error(err, 'no errors');
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
        t.error(err, 'no errors');
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

        t.deepEquals(res.body, {
            total: 1,
            tokens: [{
                id: 1,
                name: 'Default Token'
            }]
        });
    } catch (err) {
        t.error(err, 'no errors');
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

        t.equals(res.statusCode, 401);
        t.deepEquals(res.body, {
            status: 401,
            message: 'You can only access your own tokens',
            messages: []
        });
    } catch (err) {
        t.error(err, 'no errors');
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


        t.deepEquals(res.body, {
            status: 200,
            message: 'Token Deleted'
        });
    } catch (err) {
        t.error(err, 'no errors');
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

        t.equals(res.statusCode, 401);
        t.deepEquals(res.body, {
            status: 401,
            message: 'Invalid token',
            messages: []
        });
    } catch (err) {
        t.error(err, 'no errors');
    }
});

flight.landing(test);
