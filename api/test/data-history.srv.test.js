import test from 'node:test';
import assert from 'assert';
import Flight from './flight.js';

const flight = new Flight();

flight.init();
flight.takeoff();

const SOURCE_URL = 'https://raw.githubusercontent.com/openaddresses/openaddresses/39e3218cee02100ce614e10812bdd74afa509dc4/sources/us/dc/statewide.json';

let dataId;

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

test('GET: api/data - capture the results id created by the Success job', async () => {
    try {
        const res = await flight.fetch('/api/data', {
            method: 'GET'
        }, true);

        assert.equal(res.body.length, 1, 'data.length: 1');
        dataId = res.body[0].id;
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

test('GET: api/data/:data/history - defaults to Success-only jobs (existing contract preserved)', async () => {
    try {
        const res = await flight.fetch(`/api/data/${dataId}/history`, {
            method: 'GET'
        }, true);

        assert.equal(res.body.jobs.length, 1, 'jobs.length: 1');
        assert.equal(res.body.jobs[0].id, 1, 'jobs[0].id: 1');
        assert.equal(res.body.jobs[0].status, 'Success', 'jobs[0].status: Success');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: api/data/:data/history?status=all - includes the failing job', async () => {
    try {
        const res = await flight.fetch(`/api/data/${dataId}/history?status=all`, {
            method: 'GET'
        }, true);

        assert.equal(res.body.jobs.length, 2, 'jobs.length: 2');

        const statuses = res.body.jobs.map((j) => j.status).sort();
        assert.deepEqual(statuses, ['Fail', 'Success'], 'jobs statuses: [Fail, Success]');

        const failJob = res.body.jobs.find((j) => j.status === 'Fail');
        assert.equal(failJob.id, 2, 'fail job.id: 2');
        assert.equal(failJob.count, 0, 'fail job.count defaults to 0, not null');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

flight.landing();
