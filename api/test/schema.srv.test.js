import fs from 'fs';
import test from 'node:test';
import assert from 'assert';
import Flight from './flight.js';

const flight = new Flight();

flight.init();
flight.takeoff();

const UPDATE = process.env.UPDATE;

test('GET: api/schema', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/schema',
            method: 'GET',
            json: true
        }, t);

        const fixture = new URL('./fixtures/get_schema.json', import.meta.url);

        assert.deepEqual(res.body, JSON.parse(fs.readFileSync(fixture)));

        if (UPDATE) {
            fs.writeFileSync(fixture, JSON.stringify(res.body, null, 4));
        }
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: api/schema?method=FAKE', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/schema?method=fake',
            method: 'GET',
            json: true
        }, false);

        assert.equal(res.status, 400, 'http: 400');

        assert.deepEqual(res.body, {
            status: 400,
            message: 'validation error',
            messages: [{
                keyword: 'enum',
                dataPath: '.method',
                schemaPath: '#/properties/method/enum',
                params: {
                    allowedValues: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'CONNECT', 'OPTIONS', 'TRACE', 'PATCH']
                },
                message: 'should be equal to one of the allowed values'
            }]
        });
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: api/schema?method=GET', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/schema?method=GET',
            method: 'GET',
            json: true
        }, false);

        assert.equal(res.status, 400, 'http: 400');
        assert.deepEqual(res.body, {
            status: 400,
            message: 'url & method params must be used together',
            messages: []
        });

    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: api/schema?url=123', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/schema?url=123',
            method: 'GET',
            json: true
        }, false);

        assert.equal(res.status, 400, 'http: 400');
        assert.deepEqual(res.body, {
            status: 400,
            message: 'url & method params must be used together',
            messages: []
        });
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: api/schema?method=POST&url=/login', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/schema?method=POST&url=/login',
            method: 'GET',
            json: true
        }, t);

        assert.equal(res.status, 200, 'http: 200');
        assert.deepEqual(res.body, {
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
                required: ['uid', 'username', 'email', 'access', 'level', 'flags'],
                additionalProperties: false,
                properties: {
                    token: { type: 'string' },
                    uid: { type: 'integer' },
                    username: { type: 'string' },
                    email: { type: 'string' },
                    access: { type: 'string', enum: ['user', 'disabled', 'admin'], description: 'The access level of a given user' },
                    level: { type: 'string', enum: ['basic', 'backer', 'sponsor'], description: 'The level of donation of a given user' },
                    flags: { type: 'object' }
                }
            }
        });

    } catch (err) {
        assert.ifError(err, 'no error');
    }
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
        }, false);

        assert.equal(res.status, 400, 'http: 400');
        assert.deepEqual(res.body, {
            status: 400,
            message: 'validation error',
            messages: [{
                keyword: 'type',
                dataPath: '.username',
                schemaPath: '#/properties/username/type',
                params: { type: 'string' },
                message: 'should be string'
            },{
                keyword: 'required',
                dataPath: '',
                schemaPath: '#/required',
                params: {
                    missingProperty: 'password'
                },
                message: 'should have required property \'password\''
            }]
        });
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

flight.landing();
