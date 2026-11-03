import CI from '../lib/ci.js';
import test from 'node:test';
import assert from 'assert';
import { MockAgent, setGlobalDispatcher } from 'undici';

test('CI#internaldiff - No File On Master', async () => {
    const mockAgent = new MockAgent();
    const mockPool = mockAgent.get('https://raw.githubusercontent.com');
    setGlobalDispatcher(mockAgent);

    mockPool.intercept({
        path: '/openaddresses/openaddresses/123/sources/us/mt/statewide.json',
    }).reply(200, {
        schema: 2,
        layers: {
            addresses: [{
                name: 'state',
                website: 'https://msl.mt.gov/geoinfo',
                license: {
                    'attribution name': 'Montana State Library',
                    'text': 'Public Domain',
                },
            }],
        },
    }, {
        headers: { 'content-type': 'application/json' },
    });

    mockPool.intercept({
        path: '/openaddresses/openaddresses/master/sources/us/mt/statewide.json',
    }).reply(404, {
        status: 404,
    }, {
        headers: { 'content-type': 'application/json' },
    });

    const jobs = await CI.internaldiff([{
        filename: 'sources/us/mt/statewide.json',
        raw: 'https://raw.githubusercontent.com/openaddresses/openaddresses/123/sources/us/mt/statewide.json',
    }]);

    assert.deepEqual(jobs, [{
        source: 'https://raw.githubusercontent.com/openaddresses/openaddresses/123/sources/us/mt/statewide.json',
        layer: 'addresses',
        name: 'state',
        license: {
            'attribution name': 'Montana State Library',
            'text': 'Public Domain',
            'website': 'https://msl.mt.gov/geoinfo',
        },
    }]);
});

test('CI#internaldiff - Internal Diff', async () => {
    const mockAgent = new MockAgent();
    const mockPool = mockAgent.get('https://raw.githubusercontent.com');
    setGlobalDispatcher(mockAgent);

    mockPool.intercept({
        path: '/openaddresses/openaddresses/123/sources/us/mt/statewide.json',
    }).reply(200, {
        schema: 2,
        layers: {
            addresses: [
                {
                    name: 'state',
                    website: 'https://msl.mt.gov/geoinfo',
                    license: {
                        'attribution name': 'Montana State Library',
                        'text': 'Public Domain',
                    },
                },
                { name: 'state-other', license: 'https://msl.mt.gov/terms' },
                { name: 'no-diff' },
            ],
            parcels: [{ name: 'state' }],
        },
    }, {
        headers: { 'content-type': 'application/json' },
    });

    mockPool.intercept({
        path: '/openaddresses/openaddresses/master/sources/us/mt/statewide.json',
    }).reply(200, {
        schema: 2,
        layers: {
            addresses: [{ name: 'state', diff: true }, { name: 'no-diff' }],
        },
    }, {
        headers: { 'content-type': 'application/json' },
    });

    const jobs = await CI.internaldiff([{
        filename: 'sources/us/mt/statewide.json',
        raw: 'https://raw.githubusercontent.com/openaddresses/openaddresses/123/sources/us/mt/statewide.json',
    }]);
    assert.deepEqual(jobs, [{
        source: 'https://raw.githubusercontent.com/openaddresses/openaddresses/123/sources/us/mt/statewide.json',
        layer: 'addresses',
        name: 'state',
        license: {
            'attribution name': 'Montana State Library',
            'text': 'Public Domain',
            'website': 'https://msl.mt.gov/geoinfo',
        },
    }, {
        // A string-valued license is not a license object - it must not be
        // spread into character-indexed junk
        source: 'https://raw.githubusercontent.com/openaddresses/openaddresses/123/sources/us/mt/statewide.json',
        layer: 'addresses',
        name: 'state-other',
        license: undefined,
    }, {
        source: 'https://raw.githubusercontent.com/openaddresses/openaddresses/123/sources/us/mt/statewide.json',
        layer: 'parcels',
        name: 'state',
        license: undefined,
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
            raw: 'https://raw.githubusercontent.com/openaddresses/openaddresses/123/scripts/au/tas/LIST_template.json',
        },
        {
            filename: 'scripts/au/tas/README.md',
            raw: 'https://raw.githubusercontent.com/openaddresses/openaddresses/123/scripts/au/tas/README.md',
        },
    ]);

    assert.deepEqual(jobs, []);
});

test('CI#format_issue - formats with count', async () => {
    const ci = new CI({
        octo: {},
        models: {
            Run: {
                jobs: async () => [
                    { id: 1, status: 'Success', source_name: 'us/ca/alameda', layer: 'addresses', name: 'county', count: 12345 },
                    { id: 2, status: 'Fail', source_name: 'us/ca/kern', layer: 'addresses', name: 'county', count: 0 },
                    { id: 3, status: 'Warn', source_name: 'us/ca/la', layer: 'parcels', name: 'county', count: null },
                ],
            },
        },
    } as unknown as ConstructorParameters<typeof CI>[0]);

    const issue = await ci.format_issue({ id: 99 } as unknown as Parameters<typeof ci.format_issue>[0]);

    assert.ok(issue.includes('[View Map](https://batch.openaddresses.io/job/1)'));
    assert.ok(issue.includes('12,345 features'));
    assert.ok(!issue.includes('job/2'), 'Failed jobs should not appear');
    assert.ok(issue.includes('[View Map](https://batch.openaddresses.io/job/3)'));
    assert.ok(!issue.includes('null'), 'Null count should not appear');
});

test('CI#format_issue - empty run returns empty string', async () => {
    const ci = new CI({
        octo: {},
        models: {
            Run: {
                jobs: async () => [
                    { id: 1, status: 'Fail', source_name: 'us/ca/kern', layer: 'addresses', name: 'county', count: 0 },
                ],
            },
        },
    } as unknown as ConstructorParameters<typeof CI>[0]);

    const issue = await ci.format_issue({ id: 99 } as unknown as Parameters<typeof ci.format_issue>[0]);
    assert.strictEqual(issue, '');
});

test('CI#format_check - in progress', async () => {
    const ci = new CI({
        octo: {},
        models: {
            Run: {
                jobs: async () => [
                    { id: 1, status: 'Success', source_name: 'us/ca/alameda', layer: 'addresses', name: 'county', count: 12345 },
                    { id: 2, status: 'Running', source_name: 'us/ca/kern', layer: 'addresses', name: 'county', count: null },
                    { id: 3, status: 'Pending', source_name: 'us/ca/la', layer: 'parcels', name: 'county', count: null },
                ],
            },
        },
    } as unknown as ConstructorParameters<typeof CI>[0]);

    const output = await ci.format_check({ id: 99, status: 'Pending' });

    assert.strictEqual(output.title, '1/3 jobs complete');
    assert.ok(output.summary.includes('| 2 | 0 | 0 | 1 |'), output.summary);
    assert.ok(output.summary.includes('/run/99)'));
    assert.ok(output.text.includes('| ✅ Success | [Job 1]('));
    assert.ok(output.text.includes('us/ca/alameda - addresses - county | 12,345 |'));
    assert.ok(output.text.includes('| 🔄 Running | [Job 2]('));
    assert.ok(!output.text.includes('null'));
});

test('CI#format_check - complete', async () => {
    const ci = new CI({
        octo: {},
        models: {
            Run: {
                jobs: async () => [
                    { id: 1, status: 'Success', source_name: 'us/ca/alameda', layer: 'addresses', name: 'county', count: 12345 },
                    { id: 2, status: 'Fail', source_name: 'us/ca/kern', layer: 'addresses', name: 'county', count: 0 },
                    { id: 3, status: 'Warn', source_name: 'us/ca/la', layer: 'parcels', name: 'county', count: 10 },
                ],
            },
        },
    } as unknown as ConstructorParameters<typeof CI>[0]);

    const output = await ci.format_check({ id: 99, status: 'Fail' });

    assert.strictEqual(output.title, '3 jobs: 1 succeeded, 1 warned, 1 failed');
    assert.ok(output.summary.includes('| 0 | 1 | 1 | 1 |'), output.summary);
    assert.ok(output.text.includes('| ❌ Fail | [Job 2]('));
    assert.ok(output.text.includes('| ⚠️ Warn | [Job 3]('));
});

test('CI#format_check - truncates long job lists', async () => {
    const jobs = Array.from({ length: 2000 }, (_, i) => ({
        id: i + 1, status: 'Success', source_name: `us/xx/source-${i}`, layer: 'addresses', name: 'county', count: 1000,
    }));

    const ci = new CI({
        octo: {},
        models: { Run: { jobs: async () => jobs } },
    } as unknown as ConstructorParameters<typeof CI>[0]);

    const output = await ci.format_check({ id: 99, status: 'Success' });

    assert.ok(output.text.length <= 65535, String(output.text.length));
    assert.ok(output.text.endsWith('/run/99)._'));
    assert.ok(output.text.includes('[Job 1]('));
    assert.ok(!output.text.includes('[Job 2000]('));
});
