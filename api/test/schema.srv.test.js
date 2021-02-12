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
        json: true,
    }, (err, res) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 200, 'http: 200');

        const fixture = path.resolve(__dirname, './fixtures/get_schema.json');
        if (UPDATE) {
            fs.writeFileSync(fixture, JSON.stringify(res.body, null, 4))
        }

        t.deepEquals(res.body, JSON.parse(fs.readFileSync(fixture)))

        t.end();
    });
});

flight.landing(test);
