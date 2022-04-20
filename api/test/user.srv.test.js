import test from 'tape';
import Flight from './flight.mjs';
import { sql } from 'slonik';
import moment from 'moment';

const flight = new Flight();
flight.init(test);
flight.takeoff(test);

test('GET: api/user (no auth)', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/user',
            method: 'GET',
            json: true
        }, false);
        t.equals(res.statusCode, 403, 'http: 403');
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('POST: api/user', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/user',
            method: 'POST',
            json: true,
            body: {
                username: 'ingalls',
                password: 'password123',
                email: 'ingalls@example.com'
            }
        }, t);

        t.deepEquals(res.body, {
            id: 1,
            level: 'basic',
            username: 'ingalls'    ,
            email: 'ingalls@example.com',
            access: 'user',
            flags: {}
        }, 'user');

    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('POST: api/login (failed)', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/login',
            method: 'POST',
            json: true,
            body: {
                username: 'ingalls',
                password: 'password124'
            }
        }, false);

        t.equals(res.statusCode, 403, 'http: 403');
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('POST: api/login (not confirmed)', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/login',
            method: 'POST',
            json: true,
            body: {
                username: 'ingalls',
                password: 'password123'
            }
        }, false);

        t.equals(res.statusCode, 403, 'http: 403');
        t.deepEquals(res.body, {
            status: 403, message: 'User has not confirmed email', messages: []
        });

    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('META: Validate User', async (t) => {
    try {
        await flight.config.pool.query(sql`
            UPDATE users SET validated = True;
        `);
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

let token;
test('POST: api/login (success)', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/login',
            method: 'POST',
            json: true,
            body: {
                username: 'ingalls',
                password: 'password123'
            }
        }, t);

        t.ok(res.body.token);
        token = res.body.token;
        delete res.body.token;

        t.deepEquals(res.body, {
            uid: 1,
            username: 'ingalls',
            level: 'basic',
            email: 'ingalls@example.com',
            access: 'user',
            flags: {}
        });

    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET: api/login', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/login',
            auth: {
                bearer: token
            },
            method: 'GET',
            json: true
        }, t);

        t.deepEquals(res.body, {
            uid: 1,
            username: 'ingalls'    ,
            level: 'basic',
            email: 'ingalls@example.com',
            access: 'user',
            flags: {}
        }, 'user');

    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

flight.user(test, 'admin', true);
flight.user(test, 'basic');
flight.user(test, 'backer', false, {
    level: 'backer'
});
flight.user(test, 'sponsor', false, {
    level: 'sponsor'
});

test('GET: api/user', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/user',
            auth: {
                bearer: flight.token.admin
            },
            method: 'GET',
            json: true
        }, t);

        t.deepEquals(res.body, {
            total: 5,
            users: [{
                id: 5,
                level: 'sponsor',
                username: 'sponsor',
                email: 'sponsor@openaddresses.io',
                access: 'user',
                flags: {}
            }, {
                id: 4,
                level: 'backer',
                username: 'backer',
                email: 'backer@openaddresses.io',
                access: 'user',
                flags: {}
            }, {
                id: 3,
                level: 'basic',
                username: 'basic',
                email: 'basic@openaddresses.io',
                access: 'user',
                flags: {}
            }, {
                id: 2,
                level: 'basic',
                username: 'admin',
                email: 'admin@openaddresses.io',
                access: 'admin',
                flags: {}
            }, {
                id: 1,
                level: 'basic',
                username: 'ingalls',
                email: 'ingalls@example.com',
                access: 'user',
                flags: {}
            }]
        });
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET: api/user?level=backer', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/user?level=backer',
            auth: {
                bearer: flight.token.admin
            },
            method: 'GET',
            json: true
        }, t);

        t.deepEquals(res.body, {
            total: 1,
            users: [{
                id: 4,
                level: 'backer',
                username: 'backer',
                email: 'backer@openaddresses.io',
                access: 'user',
                flags: {}
            }]
        });
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET: api/user?level=sponsor', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/user?level=sponsor',
            auth: {
                bearer: flight.token.admin
            },
            method: 'GET',
            json: true
        }, t);

        t.deepEquals(res.body, {
            total: 1,
            users: [{
                id: 5,
                level: 'sponsor',
                username: 'sponsor',
                email: 'sponsor@openaddresses.io',
                access: 'user',
                flags: {}
            }]
        });
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET: api/user?filter=ADMIN', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/user?filter=ADMIN',
            auth: {
                bearer: flight.token.admin
            },
            method: 'GET',
            json: true
        }, t);

        t.deepEquals(res.body, {
            total: 1,
            users: [{
                id: 2,
                level: 'basic',
                username: 'admin',
                email: 'admin@openaddresses.io',
                access: 'admin',
                flags: {}
            }]
        });
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET: api/user?access=admin', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/user?access=admin',
            auth: {
                bearer: flight.token.admin
            },
            method: 'GET',
            json: true
        }, t);

        t.deepEquals(res.body, {
            total: 1,
            users: [{
                id: 2,
                level: 'basic',
                username: 'admin',
                email: 'admin@openaddresses.io',
                access: 'admin',
                flags: {}
            }]
        });
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET: api/user?before=<NOW>', async (t) => {
    try {
        const res = await flight.request({
            url: `/api/user?before=${encodeURIComponent(moment().toDate().toISOString())}`,
            auth: {
                bearer: flight.token.admin
            },
            method: 'GET',
            json: true
        }, t);

        t.deepEquals(res.body, {
            total: 5,
            users: [{
                id: 5,
                level: 'sponsor',
                username: 'sponsor',
                email: 'sponsor@openaddresses.io',
                access: 'user',
                flags: {}
            }, {
                id: 4,
                level: 'backer',
                username: 'backer',
                email: 'backer@openaddresses.io',
                access: 'user',
                flags: {}
            }, {
                id: 3,
                level: 'basic',
                username: 'basic',
                email: 'basic@openaddresses.io',
                access: 'user',
                flags: {}
            }, {
                id: 2,
                level: 'basic',
                username: 'admin',
                email: 'admin@openaddresses.io',
                access: 'admin',
                flags: {}
            }, {
                id: 1,
                level: 'basic',
                username: 'ingalls',
                email: 'ingalls@example.com',
                access: 'user',
                flags: {}
            }]
        });
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET: api/user?after=<NOW>', async (t) => {
    try {
        const res = await flight.request({
            url: `/api/user?after=${encodeURIComponent(moment().toDate().toISOString())}`,
            auth: {
                bearer: flight.token.admin
            },
            method: 'GET',
            json: true
        }, t);

        t.deepEquals(res.body, {
            total: 0,
            users: []
        });
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

flight.landing(test);
