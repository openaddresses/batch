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
            addresses: [{
                name: 'state',
                website: 'https://msl.mt.gov/geoinfo',
                license: {
                    'attribution name': 'Montana State Library',
                    text: 'Public Domain'
                }
            }]
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
        name: 'state',
        license: {
            'attribution name': 'Montana State Library',
            text: 'Public Domain',
            website: 'https://msl.mt.gov/geoinfo'
        }
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
            addresses: [
                {
                    name: 'state',
                    website: 'https://msl.mt.gov/geoinfo',
                    license: {
                        'attribution name': 'Montana State Library',
                        text: 'Public Domain'
                    }
                },
                { name: 'state-other', license: 'https://msl.mt.gov/terms' },
                { name: 'no-diff' }
            ],
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
        name: 'state',
        license: {
            'attribution name': 'Montana State Library',
            text: 'Public Domain',
            website: 'https://msl.mt.gov/geoinfo'
        }
    },{
        // A string-valued license is not a license object - it must not be
        // spread into character-indexed junk
        source: 'https://raw.githubusercontent.com/openaddresses/openaddresses/123/sources/us/mt/statewide.json',
        layer: 'addresses',
        name: 'state-other',
        license: undefined
    },{
        source: 'https://raw.githubusercontent.com/openaddresses/openaddresses/123/sources/us/mt/statewide.json',
        layer: 'parcels',
        name: 'state',
        license: undefined
    }]);
});

test('CI#internaldiff - ignores non-sources JSON files', async () => {
    const mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);

    // No interceptors are registered - if internaldiff() attempted to fetch
    // either of these files it would throw, since they live outside sources/
    // (a template) or aren't JSON (a README) and must be skipped before any
    // network call is made. This reproduces openaddresses/openaddresses#7988,
    // where scripts/au/tas/LIST_template.json - a template file containing
    // unresolved {PLACEHOLDER} tokens - was being queued as a real job.
    const jobs = await CI.internaldiff([
        {
            filename: 'scripts/au/tas/LIST_template.json',
            raw: 'https://raw.githubusercontent.com/openaddresses/openaddresses/123/scripts/au/tas/LIST_template.json'
        },
        {
            filename: 'scripts/au/tas/README.md',
            raw: 'https://raw.githubusercontent.com/openaddresses/openaddresses/123/scripts/au/tas/README.md'
        }
    ]);

    assert.deepEqual(jobs, []);
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
