'use strict';

const fs = require('fs');
const path = require('path');
const test = require('tape');
const Flight = require('./flight');

const flight = new Flight();

flight.init(test);
flight.takeoff(test);

const UPDATE = process.env.UPDATE;
const VERBS = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'CONNECT', 'OPTIONS', 'TRACE', 'PATCH'];

/**
 * Sort a schema object by verb and URL path
 * @param {Object} s Schema Object
 * @returns {Object} sorted schema object
 */
function sort(s) {
    const new_s = {};
    Object.keys(s).sort((a, b) => {
        const a_method = a.split(' ')[0];
        const a_url = a.split(' ')[1];
        const b_method = b.split(' ')[0];
        const b_url = b.split(' ')[1];

        if (a_url === b_url) return VERBS.indexOf(a_method) - VERBS.indexOf(b_method);

        const n = [a_url, b_url].sort();

        if (a_url.split('/').length !== b_url.split('/')) return a_url.split('/').length - b_url.split('/');

        if (n[0] === b) return 1;
        else return -1;
    }).map((k) => new_s[k] = s[k]);

    return new_s;
}

test('GET: api/schema', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/schema',
            method: 'GET',
            json: true
        });

        t.equals(res.statusCode, 200, 'http: 200');

        const fixture = path.resolve(__dirname, './fixtures/get_schema.json');

        t.deepEquals(res.body, JSON.parse(fs.readFileSync(fixture)));

        if (UPDATE) {
            fs.writeFileSync(fixture, JSON.stringify(sort(res.body), null, 4));
        }
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET: api/schema?method=FAKE', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/schema?method=fake',
            method: 'GET',
            json: true
        });

        t.equals(res.statusCode, 400, 'http: 400');
        t.deepEquals(res.body, {
            status: 400,
            message: 'validation error',
            messages: [{
                message: 'should be equal to one of the allowed values'
            }]
        });
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET: api/schema?method=GET', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/schema?method=GET',
            method: 'GET',
            json: true
        });

        t.equals(res.statusCode, 400, 'http: 400');
        t.deepEquals(res.body, {
            status: 400,
            message: 'url & method params must be used together',
            messages: []
        });

    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET: api/schema?url=123', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/schema?url=123',
            method: 'GET',
            json: true
        });

        t.equals(res.statusCode, 400, 'http: 400');
        t.deepEquals(res.body, {
            status: 400,
            message: 'url & method params must be used together',
            messages: []
        });
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET: api/schema?method=POST&url=/login', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/schema?method=POST&url=/login',
            method: 'GET',
            json: true
        });

        t.equals(res.statusCode, 200, 'http: 200');
        t.deepEquals(res.body, {
            body: {
                type: 'object',
                additionalProperties: false,
                required: ['username', 'password'],
                properties: {
                    username: {
                        type: 'string',
                        description: 'username'
                    },
                    password: {
                        type: 'string',
                        description: 'password'
                    }
                }
            },
            query: null,
            res: {
                type: 'object',
                required: [ 'uid', 'username', 'email', 'access', 'level', 'flags' ],
                additionalProperties: false,
                properties: {
                    uid: { type: 'integer' },
                    username: { type: 'string' },
                    email: { type: 'string' },
                    access: { type: 'string', enum: [ 'user', 'disabled', 'admin' ], description: 'The access level of a given user' },
                    level: { type: 'string', enum: [ 'basic', 'backer', 'sponsor' ], description: 'The level of donation of a given user' },
                    flags: { type: 'object' }
                }
            }
        });

    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('POST: api/login', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/login',
            method: 'POST',
            json: true,
            body: {
                fake: 123,
                username: 123
            }
        });

        t.equals(res.statusCode, 400, 'http: 400');
        t.deepEquals(res.body, {
            status: 400,
            message: 'validation error',
            messages: [{
                message: 'should NOT have additional properties'
            },{
                message: 'should be string'
            },{
                message: 'should have required property \'password\''
            }]
        });
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

flight.landing(test);
