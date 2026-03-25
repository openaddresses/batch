import CI from '../lib/ci.js';
import Run from '../lib/types/run.js';
import test from 'node:test';
import assert from 'assert';
import { MockAgent, setGlobalDispatcher } from 'undici';

test('CI#internaldiff - No File On Master', async () => {
    const mockAgent = new MockAgent();
    const mockPool = mockAgent.get('https://raw.githubusercontent.com');
    setGlobalDispatcher(mockAgent);

    mockPool.intercept({
        path: '/openaddresses/openaddresses/123/sources/us/mt/statewide.json'
    }).reply(200, {
        schema: 2,
        layers: {
            addresses: [{ name: 'state' }]
        }
    }, {
        headers: { 'content-type': 'application/json' }
    });

    mockPool.intercept({
        path: '/openaddresses/openaddresses/master/sources/us/mt/statewide.json'
    }).reply(404, {
        status: 404
    }, {
        headers: { 'content-type': 'application/json' }
    });

    const jobs = await CI.internaldiff([{
        filename: 'sources/us/mt/statewide.json',
        raw: 'https://raw.githubusercontent.com/openaddresses/openaddresses/123/sources/us/mt/statewide.json'
    }]);

    assert.deepEqual(jobs, [{
        source: 'https://raw.githubusercontent.com/openaddresses/openaddresses/123/sources/us/mt/statewide.json',
        layer: 'addresses',
        name: 'state'
    }]);
});

test('CI#internaldiff - Internal Diff', async () => {
    const mockAgent = new MockAgent();
    const mockPool = mockAgent.get('https://raw.githubusercontent.com');
    setGlobalDispatcher(mockAgent);

    mockPool.intercept({
        path: '/openaddresses/openaddresses/123/sources/us/mt/statewide.json'
    }).reply(200, {
        schema: 2,
        layers: {
            addresses: [{ name: 'state' }, { name: 'state-other' }, { name: 'no-diff' }],
            parcels: [{ name: 'state' }]
        }
    }, {
        headers: { 'content-type': 'application/json' }
    });

    mockPool.intercept({
        path: '/openaddresses/openaddresses/master/sources/us/mt/statewide.json'
    }).reply(200, {
        schema: 2,
        layers: {
            addresses: [{ name: 'state', diff: true }, { name: 'no-diff' }]
        }
    }, {
        headers: { 'content-type': 'application/json' }
    });

    const jobs = await CI.internaldiff([{
        filename: 'sources/us/mt/statewide.json',
        raw: 'https://raw.githubusercontent.com/openaddresses/openaddresses/123/sources/us/mt/statewide.json'
    }]);
    assert.deepEqual(jobs, [{
        source: 'https://raw.githubusercontent.com/openaddresses/openaddresses/123/sources/us/mt/statewide.json',
        layer: 'addresses',
        name: 'state'
    },{
        source: 'https://raw.githubusercontent.com/openaddresses/openaddresses/123/sources/us/mt/statewide.json',
        layer: 'addresses',
        name: 'state-other'
    },{
        source: 'https://raw.githubusercontent.com/openaddresses/openaddresses/123/sources/us/mt/statewide.json',
        layer: 'parcels',
        name: 'state'
    }]);
});

test('CI#format_issue - formats with count', async (t) => {
    const ci = new CI({ octo: {} });
    const origJobs = Run.jobs;
    t.after(() => { Run.jobs = origJobs; });

    Run.jobs = async () => [
        { id: 1, status: 'Success', source_name: 'us/ca/alameda', layer: 'addresses', name: 'county', count: 12345 },
        { id: 2, status: 'Fail', source_name: 'us/ca/kern', layer: 'addresses', name: 'county', count: 0 },
        { id: 3, status: 'Warn', source_name: 'us/ca/la', layer: 'parcels', name: 'county', count: null }
    ];

    const issue = await ci.format_issue(null, { id: 99 });

    assert.ok(issue.includes('[View Map](https://batch.openaddresses.io/job/1)'));
    assert.ok(issue.includes('12,345 features'));
    assert.ok(!issue.includes('job/2'), 'Failed jobs should not appear');
    assert.ok(issue.includes('[View Map](https://batch.openaddresses.io/job/3)'));
    assert.ok(!issue.includes('null'), 'Null count should not appear');
});

test('CI#format_issue - empty run returns empty string', async (t) => {
    const ci = new CI({ octo: {} });
    const origJobs = Run.jobs;
    t.after(() => { Run.jobs = origJobs; });

    Run.jobs = async () => [
        { id: 1, status: 'Fail', source_name: 'us/ca/kern', layer: 'addresses', name: 'county', count: 0 }
    ];

    const issue = await ci.format_issue(null, { id: 99 });
    assert.strictEqual(issue, '');
});
