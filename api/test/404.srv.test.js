import test from 'node:test';
import Flight from './flight.js';
import assert from 'assert';

const flight = new Flight();
flight.init();
flight.takeoff();

test('GET: /api/nonexistant', async () => {
    try {
        const res = await flight.fetch('/api/non-existant', {
            method: 'GET'
        }, false);

        assert.equal(res.status, 404, 'http: 404');
        assert.deepEqual(await res.body, {
            status: 404,
            message: 'API endpoint does not exist!',
            messages: []
        });

    } catch (err) {
        assert.fail(err);
    }
});

flight.landing();
