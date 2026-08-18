import test from 'node:test';
import assert from 'assert';
import Flight from './flight.js';
import { MockAgent, setGlobalDispatcher } from 'undici';

const flight = new Flight();
flight.init();
flight.takeoff();

test('setup mock for GitHub API', () => {
    const mockAgent = new MockAgent();
    setGlobalDispatcher(mockAgent);

    const mockPool = mockAgent.get('https://raw.githubusercontent.com');
    mockPool
        .intercept({
            path: '/openaddresses/openaddresses/testsha1/sources/ca/mb/brandon.json',
            method: 'GET'
        })
        .reply(200, {
            schema: 2,
            coverage: { country: 'ca' },
            layers: {
                addresses: [{
                    name: 'city',
                    website: 'https://opengov.brandon.ca/OpenDataService/opendata.html',
                    license: {
                        url: 'https://opendata.brandon.ca/terms.aspx',
                        'attribution name': 'City of Brandon',
                        text: 'Contains public sector Datasets made available under the City of Brandon\'s Open Data Licence'
                    }
                }]
            }
        });
});

test('POST /api/run', async () => {
    try {
        const res = await flight.fetch('/api/run', {
            method: 'POST',
            headers: { 'shared-secret': '123' },
            body: { live: true }
        }, true);

        assert.equal(res.body.id, 1, 'run.id: 1');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('POST /api/run/1/jobs populates job.license', async () => {
    try {
        const res = await flight.fetch('/api/run/1/jobs', {
            method: 'POST',
            headers: { 'shared-secret': '123' },
            body: {
                jobs: ['https://raw.githubusercontent.com/openaddresses/openaddresses/testsha1/sources/ca/mb/brandon.json']
            }
        }, true);

        assert.equal(res.body.run, 1, 'run: 1');
        assert.deepEqual(res.body.jobs, [1], 'jobs: [1]');
        assert.deepEqual(res.body.errors, [], 'no errors');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET /api/job/1 returns the populated license', async () => {
    try {
        const res = await flight.fetch('/api/job/1', {
            method: 'GET',
            headers: { 'shared-secret': '123' }
        }, true);

        assert.deepEqual(res.body.license, {
            url: 'https://opendata.brandon.ca/terms.aspx',
            'attribution name': 'City of Brandon',
            text: 'Contains public sector Datasets made available under the City of Brandon\'s Open Data Licence',
            website: 'https://opengov.brandon.ca/OpenDataService/opendata.html'
        }, 'job.license: <merged license + website>');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

flight.landing();
