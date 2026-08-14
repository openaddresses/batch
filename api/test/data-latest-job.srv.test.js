import test from 'node:test';
import assert from 'assert';
import Flight from './flight.js';

const flight = new Flight();

flight.init();
flight.takeoff();

const SOURCE_URL = 'https://raw.githubusercontent.com/openaddresses/openaddresses/39e3218cee02100ce614e10812bdd74afa509dc4/sources/us/dc/statewide.json';

test('POST: api/run (run 1 - will hold the successful job)', async () => {
    try {
        const res = await flight.fetch('/api/run', {
            method: 'POST',
            headers: {
                'shared-secret': '123'
            },
            body: {
                live: true
            }
        }, true);

        assert.equal(res.body.id, 1, 'run.id: 1');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('POST: api/run/1/jobs', async () => {
    try {
        const res = await flight.fetch('/api/run/1/jobs', {
            method: 'POST',
            headers: {
                'shared-secret': '123'
            },
            body: {
                jobs: [SOURCE_URL]
            }
        }, false);

        assert.deepEqual(res.body.jobs, [1], 'jobs: [1]');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('PATCH: api/job/1 -> Success', async () => {
    try {
        const res = await flight.fetch('/api/job/1', {
            method: 'PATCH',
            headers: {
                'shared-secret': '123'
            },
            body: {
                status: 'Success'
            }
        }, true);

        assert.equal(res.body.status, 'Success', 'job.status: Success');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: api/data - job and latest_job both point at the successful job', async () => {
    try {
        const res = await flight.fetch('/api/data', {
            method: 'GET'
        }, true);

        assert.equal(res.body.length, 1, 'data.length: 1');
        assert.equal(res.body[0].job, 1, 'data.job: 1');
        assert.equal(res.body[0].latest_job, 1, 'data.latest_job: 1');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('POST: api/run (run 2 - will hold the failing job)', async () => {
    try {
        const res = await flight.fetch('/api/run', {
            method: 'POST',
            headers: {
                'shared-secret': '123'
            },
            body: {
                live: true
            }
        }, true);

        assert.equal(res.body.id, 2, 'run.id: 2');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('POST: api/run/2/jobs', async () => {
    try {
        const res = await flight.fetch('/api/run/2/jobs', {
            method: 'POST',
            headers: {
                'shared-secret': '123'
            },
            body: {
                jobs: [SOURCE_URL]
            }
        }, false);

        assert.deepEqual(res.body.jobs, [2], 'jobs: [2]');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('PATCH: api/job/2 -> Fail', async () => {
    try {
        const res = await flight.fetch('/api/job/2', {
            method: 'PATCH',
            headers: {
                'shared-secret': '123'
            },
            body: {
                status: 'Fail'
            }
        }, true);

        assert.equal(res.body.status, 'Fail', 'job.status: Fail');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: api/data - job stays on the last success, latest_job moves to the failing attempt', async () => {
    try {
        const res = await flight.fetch('/api/data', {
            method: 'GET'
        }, true);

        assert.equal(res.body.length, 1, 'data.length: 1');
        assert.equal(res.body[0].job, 1, 'data.job (last success): 1');
        assert.equal(res.body[0].latest_job, 2, 'data.latest_job (most recent attempt): 2');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

flight.landing();
