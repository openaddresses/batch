import test from 'node:test';
import assert from 'assert';
import Flight from './flight.js';
import { sql } from 'slonik';
import moment from 'moment';

const flight = new Flight();
flight.init();
flight.takeoff();

test('GET: api/user (no auth)', async () => {
    try {
        const res = await flight.fetch('/api/user', {
            method: 'GET'
        }, false);

        assert.equal(res.status, 403, 'http: 403');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('POST: api/user', async () => {
    try {
        const res = await flight.fetch('/api/user', {
            method: 'POST',
            body: {
                username: 'ingalls',
                password: 'password123',
                email: 'ingalls@example.com'
            }
        }, true);

        assert.deepEqual(res.body, {
            id: 1,
            level: 'basic',
            username: 'ingalls'    ,
            email: 'ingalls@example.com',
            access: 'user',
            flags: {}
        }, 'user');

    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('POST: api/login (failed)', async () => {
    try {
        const res = await flight.fetch('/api/login', {
            method: 'POST',
            body: {
                username: 'ingalls',
                password: 'password124'
            }
        }, false);

        assert.equal(res.status, 403, 'http: 403');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('POST: api/login (not confirmed)', async () => {
    try {
        const res = await flight.fetch('/api/login', {
            method: 'POST',
            json: true,
            body: {
                username: 'ingalls',
                password: 'password123'
            }
        }, false);

        assert.equal(res.status, 403, 'http: 403');
        assert.deepEqual(res.body, {
            status: 403, message: 'User has not confirmed email', messages: []
        });

    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('META: Validate User', async () => {
    try {
        await flight.config.pool.query(sql`
            UPDATE users SET validated = True;
        `);
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

let token;
test('POST: api/login (success)', async () => {
    try {
        const res = await flight.fetch('/api/login', {
            method: 'POST',
            body: {
                username: 'ingalls',
                password: 'password123'
            }
        }, true);

        assert.ok(res.body.token);
        token = res.body.token;
        delete res.body.token;

        assert.deepEqual(res.body, {
            uid: 1,
            username: 'ingalls',
            level: 'basic',
            email: 'ingalls@example.com',
            access: 'user',
            flags: {}
        });

    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: api/login', async () => {
    try {
        const res = await flight.fetch('/api/login', {
            auth: {
                bearer: token
            },
            method: 'GET'
        }, true);

        assert.deepEqual(res.body, {
            uid: 1,
            username: 'ingalls'    ,
            level: 'basic',
            email: 'ingalls@example.com',
            access: 'user',
            flags: {}
        }, 'user');

    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

flight.user('admin', true);
flight.user('basic');
flight.user('backer', false, {
    level: 'backer'
});
flight.user('sponsor', false, {
    level: 'sponsor'
});

test('GET: api/user', async () => {
    try {
        const res = await flight.fetch('/api/user', {
            auth: {
                bearer: flight.token.admin
            },
            method: 'GET'
        }, true);

        assert.deepEqual(res.body, {
            total: 5,
            users: [{
                id: 5,
                level: 'sponsor',
                username: 'sponsor',
                email: 'sponsor@openaddresses.io',
                access: 'user',
                flags: {},
                validated: true
            }, {
                id: 4,
                level: 'backer',
                username: 'backer',
                email: 'backer@openaddresses.io',
                access: 'user',
                flags: {},
                validated: true
            }, {
                id: 3,
                level: 'basic',
                username: 'basic',
                email: 'basic@openaddresses.io',
                access: 'user',
                flags: {},
                validated: true
            }, {
                id: 2,
                level: 'basic',
                username: 'admin',
                email: 'admin@openaddresses.io',
                access: 'admin',
                flags: {},
                validated: true
            }, {
                id: 1,
                level: 'basic',
                username: 'ingalls',
                email: 'ingalls@example.com',
                access: 'user',
                flags: {},
                validated: true
            }]
        });
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: api/user?level=backer', async () => {
    try {
        const res = await flight.fetch('/api/user?level=backer', {
            auth: {
                bearer: flight.token.admin
            },
            method: 'GET'
        }, true);

        assert.deepEqual(res.body, {
            total: 1,
            users: [{
                id: 4,
                level: 'backer',
                username: 'backer',
                email: 'backer@openaddresses.io',
                access: 'user',
                flags: {},
                validated: true
            }]
        });
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: api/user?level=sponsor', async () => {
    try {
        const res = await flight.fetch('/api/user?level=sponsor', {
            auth: {
                bearer: flight.token.admin
            },
            method: 'GET'
        }, true);

        assert.deepEqual(res.body, {
            total: 1,
            users: [{
                id: 5,
                level: 'sponsor',
                username: 'sponsor',
                email: 'sponsor@openaddresses.io',
                access: 'user',
                flags: {},
                validated: true
            }]
        });
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: api/user?filter=ADMIN', async () => {
    try {
        const res = await flight.fetch('/api/user?filter=ADMIN', {
            auth: {
                bearer: flight.token.admin
            },
            method: 'GET'
        }, true);

        assert.deepEqual(res.body, {
            total: 1,
            users: [{
                id: 2,
                level: 'basic',
                username: 'admin',
                email: 'admin@openaddresses.io',
                access: 'admin',
                flags: {},
                validated: true
            }]
        });
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: api/user?access=admin', async () => {
    try {
        const res = await flight.fetch('/api/user?access=admin', {
            auth: {
                bearer: flight.token.admin
            },
            method: 'GET'
        }, true);

        assert.deepEqual(res.body, {
            total: 1,
            users: [{
                id: 2,
                level: 'basic',
                username: 'admin',
                email: 'admin@openaddresses.io',
                access: 'admin',
                flags: {},
                validated: true
            }]
        });
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: api/user?before=<NOW>', async () => {
    try {
        const res = await flight.fetch(`/api/user?before=${encodeURIComponent(moment().toDate().toISOString())}`, {
            auth: {
                bearer: flight.token.admin
            },
            method: 'GET'
        }, true);

        assert.deepEqual(res.body, {
            total: 5,
            users: [{
                id: 5,
                level: 'sponsor',
                username: 'sponsor',
                email: 'sponsor@openaddresses.io',
                access: 'user',
                flags: {},
                validated: true
            }, {
                id: 4,
                level: 'backer',
                username: 'backer',
                email: 'backer@openaddresses.io',
                access: 'user',
                flags: {},
                validated: true
            }, {
                id: 3,
                level: 'basic',
                username: 'basic',
                email: 'basic@openaddresses.io',
                access: 'user',
                flags: {},
                validated: true
            }, {
                id: 2,
                level: 'basic',
                username: 'admin',
                email: 'admin@openaddresses.io',
                access: 'admin',
                flags: {},
                validated: true
            }, {
                id: 1,
                level: 'basic',
                username: 'ingalls',
                email: 'ingalls@example.com',
                access: 'user',
                flags: {},
                validated: true
            }]
        });
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: api/user?after=<NOW>', async () => {
    try {
        const res = await flight.fetch(`/api/user?after=${encodeURIComponent(moment().toDate().toISOString())}`, {
            auth: {
                bearer: flight.token.admin
            },
            method: 'GET'
        }, true);

        assert.deepEqual(res.body, {
            total: 0,
            users: []
        });
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

flight.landing();
