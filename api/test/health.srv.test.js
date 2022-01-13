'use strict';
const test = require('tape');
const Flight = require('./flight');

const flight = new Flight();
flight.init(test);
flight.takeoff(test);

test('GET: /health', async (t) => {
    try {
        const res = await flight.request({
            url: '/health',
            method: 'GET',
            json: true
        }, false);

        t.equals(res.statusCode, 200, 'http: 200');
        t.deepEquals(res.body, {
            healthy: true,
            message: 'I work all day, I work all night to get the open the data!'
        });

    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

flight.landing(test);
