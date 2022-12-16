import CI from '../lib/ci.js';
import test from 'node:test';
import assert from 'assert';
import { MockAgent, setGlobalDispatcher } from 'undici';

test('CI#internaldiff - No File On Master', async () => {
    const mockAgent = new MockAgent();
    const mockPool = mockAgent.get('https://raw.githubusercontent.com');
    setGlobalDispatcher(mockAgent)

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
    setGlobalDispatcher(mockAgent)

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
