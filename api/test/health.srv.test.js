import test from 'node:test';
import assert from 'assert';
import Flight from './flight.js';

const flight = new Flight();
flight.init();
flight.takeoff();

test('GET: /health', async (t) => {
    try {
        const res = await flight.request({
            url: '/health',
            method: 'GET',
            json: true
        }, false);

        assert.equal(res.status, 200, 'http: 200');
        assert.deepEqual(res.body, {
            healthy: true,
            message: 'I work all day, I work all night to get the open the data!'
        });

    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

flight.landing();
