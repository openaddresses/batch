'use strict';

const fs = require('fs');
const path = require('path');
const test = require('tape');
const request = require('request');
const Flight = require('./init');

const flight = new Flight();

flight.init(test);
flight.takeoff(test);

const UPDATE = process.env.UPDATE;

test('GET: api/schema', (t) => {
    request({
        url: 'http://localhost:4999/api/schema',
        method: 'GET',
        json: true
    }, (err, res) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 200, 'http: 200');

        const fixture = path.resolve(__dirname, './fixtures/get_schema.json');
        if (UPDATE) {
            fs.writeFileSync(fixture, JSON.stringify(res.body, null, 4));
        }

        t.deepEquals(res.body, JSON.parse(fs.readFileSync(fixture)));

        t.end();
    });
});

test('GET: api/schema?method=FAKE', (t) => {
    request({
        url: 'http://localhost:4999/api/schema?method=fake',
        method: 'GET',
        json: true
    }, (err, res) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 400, 'http: 400');
        t.deepEquals(res.body, {
            status: 400,
            message: 'validation error',
            messages: [{
                message: 'should be equal to one of the allowed values'
            }]
        });

        t.end();
    });
});

test('GET: api/schema?method=GET', (t) => {
    request({
        url: 'http://localhost:4999/api/schema?method=GET',
        method: 'GET',
        json: true
    }, (err, res) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 400, 'http: 400');
        t.deepEquals(res.body, {
            status: 400,
            message: 'url & method params must be used together',
            messages: []
        });

        t.end();
    });
});

test('GET: api/schema?url=123', (t) => {
    request({
        url: 'http://localhost:4999/api/schema?url=123',
        method: 'GET',
        json: true
    }, (err, res) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 400, 'http: 400');
        t.deepEquals(res.body, {
            status: 400,
            message: 'url & method params must be used together',
            messages: []
        });

        t.end();
    });
});

test('GET: api/schema?method=POST&url=/login', (t) => {
    request({
        url: 'http://localhost:4999/api/schema?method=POST&url=/login',
        method: 'GET',
        json: true
    }, (err, res) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 200, 'http: 200');
        t.deepEquals(res.body, {
            body: {
                type: 'object',
                required: ['username', 'password'],
                additionalProperties: false,
                properties: {
                    username: { type: 'string', description: 'username' },
                    password: { type: 'string', description: 'password' }
                }
            },
            query: null,
            res: {
                type: 'object',
                required: ['uid', 'username', 'email', 'access', 'level', 'flags'],
                additionalProperties: false,
                properties: {
                    uid: { type: 'integer' },
                    username: { type: 'string' },
                    email: { type: 'string' },
                    access: { type: 'string', enum: ['user', 'admin'], description: 'The access level of a given user' },
                    level: { type: 'string', enum: ['basic', 'backer', 'sponsor'], description: 'The level of donation of a given user' },
                    flags: { type: 'object' } }
            }
        });

        t.end();
    });
});

test('POST: api/login', (t) => {
    request({
        url: 'http://localhost:4999/api/login',
        method: 'POST',
        json: true,
        body: {
            fake: 123,
            username: 123
        }
    }, (err, res) => {
        t.error(err, 'no error');

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

        t.end();
    });
});

flight.landing(test);
