'use strict';

const srv = require('../index.js');
const test = require('tape');
const request = require('request');
const Flight = require('./init');

const flight = new Flight();
flight.init(test);
flight.takeoff(test);

const session = request.jar();

test('GET: api/user (no auth)', (t) => {
    request({
        url: 'http://localhost:4999/api/user',
        method: 'GET',
        json: true,
        jar: session
    }, (err, res) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 401, 'http: 401');
        t.end();
    });
});

test('POST: api/user', (t) => {
    request({
        url: 'http://localhost:4999/api/user',
        method: 'POST',
        json: true,
        jar: session,
        body: {
            username: 'ingalls',
            password: 'password123',
            email: 'ingalls@example.com'
        }
    }, (err, res) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 200, 'http: 200');

        t.deepEquals(res.body, {
            id: 1,
            username: 'ingalls'    ,
            email: 'ingalls@example.com',
            access: 'user',
            flags: {}
        }, 'user');

        t.end();
    });
});

test('POST: api/login (failed)', (t) => {
    request({
        url: 'http://localhost:4999/api/login',
        method: 'POST',
        json: true,
        jar: session,
        body: {
            username: 'ingalls',
            password: 'password124'
        }
    }, (err, res) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 403, 'http: 403');

        t.end();
    });
});

test('POST: api/login (success)', (t) => {
    request({
        url: 'http://localhost:4999/api/login',
        method: 'POST',
        json: true,
        jar: session,
        body: {
            username: 'ingalls',
            password: 'password123'
        }
    }, (err, res) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 200, 'http: 200');

        t.end();
    });
});

test('GET: api/login', (t) => {
    request({
        url: 'http://localhost:4999/api/login',
        method: 'POST',
        json: true,
        jar: session,
        body: {
            username: 'ingalls',
            password: 'password123'
        }
    }, (err, res) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 200, 'http: 200');

        t.deepEquals(res.body, {
            uid: 1,
            username: 'ingalls'    ,
            email: 'ingalls@example.com',
            access: 'user',
            flags: {}
        }, 'user');

        t.end();
    });
});

flight.landing(test);
