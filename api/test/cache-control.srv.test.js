import test from 'node:test';
import Flight from './flight.js';
import assert from 'assert';

const flight = new Flight();
flight.init();
flight.takeoff();

test('GET: /api/job - Cache-Control: no-store', async () => {
    try {
        const res = await flight.fetch('/api/job', {
            method: 'GET'
        }, false);

        assert.equal(res.status, 200, 'http: 200');
        assert.equal(res.headers.get('cache-control'), 'no-store', 'header: Cache-Control: no-store');
    } catch (err) {
        assert.fail(err);
    }
});

flight.landing();
