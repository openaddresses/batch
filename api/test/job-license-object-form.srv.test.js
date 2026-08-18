import test from 'node:test';
import assert from 'assert';
import Flight from './flight.js';

const flight = new Flight();
flight.init();
flight.takeoff();

// task/sources.js and api/lib/ci.js submit jobs as pre-built OBJECTS (never
// raw source URL strings), which means explode() - and the license merge that
// lives inside it - is never reached for those callers. These tests cover that
// object form end to end: schema validation of the request body through to the
// license landing in the job row.

const LICENSE = {
    url: 'https://opendata.brandon.ca/terms.aspx',
    'attribution name': 'City of Brandon',
    text: 'Contains public sector Datasets made available under the City of Brandon\'s Open Data Licence',
    website: 'https://opengov.brandon.ca/OpenDataService/opendata.html'
};

test('POST /api/run', async () => {
    const res = await flight.fetch('/api/run', {
        method: 'POST',
        headers: { 'shared-secret': '123' },
        body: { live: true }
    }, true);

    assert.equal(res.body.id, 1, 'run.id: 1');
});

test('POST /api/run/1/jobs accepts object-form jobs with a license', async () => {
    const res = await flight.fetch('/api/run/1/jobs', {
        method: 'POST',
        headers: { 'shared-secret': '123' },
        body: {
            jobs: [{
                source: 'https://raw.githubusercontent.com/openaddresses/openaddresses/testsha1/sources/ca/mb/brandon.json',
                layer: 'addresses',
                name: 'city',
                license: LICENSE
            }]
        }
    }, true);

    assert.equal(res.body.run, 1, 'run: 1');
    assert.deepEqual(res.body.jobs, [1], 'jobs: [1]');
    assert.deepEqual(res.body.errors, [], 'no errors');
});

test('GET /api/job/1 returns the license sent in object form', async () => {
    const res = await flight.fetch('/api/job/1', {
        method: 'GET',
        headers: { 'shared-secret': '123' }
    }, true);

    assert.equal(res.body.layer, 'addresses', 'job.layer: addresses');
    assert.equal(res.body.name, 'city', 'job.name: city');
    assert.deepEqual(res.body.license, LICENSE, 'job.license: <license sent in the request body>');
});

test('POST /api/run/2/jobs accepts object-form jobs without a license', async () => {
    const run = await flight.fetch('/api/run', {
        method: 'POST',
        headers: { 'shared-secret': '123' },
        body: { live: true }
    }, true);

    assert.equal(run.body.id, 2, 'run.id: 2');

    const res = await flight.fetch('/api/run/2/jobs', {
        method: 'POST',
        headers: { 'shared-secret': '123' },
        body: {
            jobs: [{
                source: 'https://raw.githubusercontent.com/openaddresses/openaddresses/testsha1/sources/ca/mb/winnipeg.json',
                layer: 'addresses',
                name: 'city'
            }]
        }
    }, true);

    assert.deepEqual(res.body.jobs, [2], 'jobs: [2]');
    assert.deepEqual(res.body.errors, [], 'no errors');
});

flight.landing();
