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
            path: '/openaddresses/openaddresses/testshaA/sources/ca/mb/brandon.json',
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
        })
        .persist();

    mockPool
        .intercept({
            path: '/openaddresses/openaddresses/testshaB/sources/us/ca/sacramento.json',
            method: 'GET'
        })
        .reply(200, {
            schema: 2,
            coverage: { country: 'us' },
            layers: {
                addresses: [{
                    name: 'city',
                    website: 'https://data.cityofsacramento.org',
                    license: {
                        url: 'https://data.cityofsacramento.org/pages/terms',
                        'attribution name': 'City of Sacramento',
                        text: 'Open Data provided by the City of Sacramento'
                    }
                }],
                parcels: [{
                    name: 'city',
                    website: 'https://data.cityofsacramento.org',
                    license: {
                        url: 'https://data.cityofsacramento.org/pages/terms',
                        'attribution name': 'City of Sacramento',
                        text: 'Open Data provided by the City of Sacramento'
                    }
                }],
                buildings: [{
                    name: 'city'
                }]
            }
        })
        .persist();
});

test('POST /api/run', async () => {
    const res = await flight.fetch('/api/run', {
        method: 'POST',
        headers: { 'shared-secret': '123' },
        body: { live: true }
    }, true);

    assert.equal(res.body.id, 1, 'run.id: 1');
});

test('POST /api/run/1/jobs', async () => {
    const res = await flight.fetch('/api/run/1/jobs', {
        method: 'POST',
        headers: { 'shared-secret': '123' },
        body: {
            jobs: [
                'https://raw.githubusercontent.com/openaddresses/openaddresses/testshaA/sources/ca/mb/brandon.json',
                'https://raw.githubusercontent.com/openaddresses/openaddresses/testshaB/sources/us/ca/sacramento.json'
            ]
        }
    }, true);

    assert.deepEqual(res.body, { run: 1, jobs: [1, 2, 3, 4], errors: [] }, 'Run 1 populated with 4 jobs');
});

test('mark all jobs Success', async () => {
    for (const id of [1, 2, 3, 4]) {
        const res = await flight.fetch(`/api/job/${id}`, {
            method: 'PATCH',
            headers: { 'shared-secret': '123' },
            body: { status: 'Success' }
        }, true);

        assert.equal(res.body.status, 'Success', `job ${id} status: Success`);
    }
});

test('GET /api/licenses groups by attribution + license text', async () => {
    const res = await flight.fetch('/api/licenses', {
        method: 'GET'
    }, true);

    assert.deepEqual(res.body, {
        licenses: [
            {
                attribution: 'City of Brandon',
                license: 'Contains public sector Datasets made available under the City of Brandon\'s Open Data Licence',
                sources: [
                    ['ca/mb/brandon.json', 'https://opengov.brandon.ca/OpenDataService/opendata.html']
                ]
            },
            {
                attribution: 'City of Sacramento',
                license: 'Open Data provided by the City of Sacramento',
                sources: [
                    ['us/ca/sacramento.json', 'https://data.cityofsacramento.org']
                ]
            }
        ]
    }, 'grouped by attribution/license text, deduped by source, unlicensed job excluded');
});

flight.landing();
