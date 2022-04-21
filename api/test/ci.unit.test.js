import CI from '../lib/ci.js';
import test from 'node:test';
import assert from 'assert';
import nock from 'nock';

test('CI#internaldiff - No File On Master', async (t) => {
    nock('https://raw.githubusercontent.com')
        .get('/openaddresses/openaddresses/123/sources/us/mt/statewide.json')
        .reply(200, JSON.stringify({
            schema: 2,
            layers: {
                addresses: [{ name: 'state' }]
            }
        }))
        .get('/openaddresses/openaddresses/master/sources/us/mt/statewide.json')
        .reply(404, 'NOT FOUND');

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

test('CI#internaldiff - Internal Diff', async (t) => {
    nock('https://raw.githubusercontent.com')
        .get('/openaddresses/openaddresses/123/sources/us/mt/statewide.json')
        .reply(200, JSON.stringify({
            schema: 2,
            layers: {
                addresses: [{ name: 'state' }, { name: 'state-other' }, { name: 'no-diff' }],
                parcels: [{ name: 'state' }]
            }
        }))
        .get('/openaddresses/openaddresses/master/sources/us/mt/statewide.json')
        .reply(200, JSON.stringify({
            schema: 2,
            layers: {
                addresses: [{ name: 'state', diff: true }, { name: 'no-diff' }]
            }
        }));

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

test('close', (t) => {
    nock.cleanAll();
    nock.enableNetConnect();
});
