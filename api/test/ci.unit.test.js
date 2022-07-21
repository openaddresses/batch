import CI from '../lib/ci.js';
import test from 'node:test';
import assert from 'assert';

test('CI#internaldiff - No File On Master', async () => {
    const jobs = await CI.internaldiff([{
        filename: 'sources/us/mt/statewide.json',
        raw: 'https://raw.githubusercontent.com/openaddresses/openaddresses/123/sources/us/mt/statewide.json'
    }], async function(url, opts) {
        if (new URL(url).pathname === '/openaddresses/openaddresses/123/sources/us/mt/statewide.json') {
            return new Response(JSON.stringify({
                schema: 2,
                layers: {
                    addresses: [{ name: 'state' }]
                }
            }));
        } else if (new URL(url).pathname === '/openaddresses/openaddresses/master/sources/us/mt/statewide.json') {
            return new Response('NOT FOUND', {
                status: 404
            });
        }
    });

    assert.deepEqual(jobs, [{
        source: 'https://raw.githubusercontent.com/openaddresses/openaddresses/123/sources/us/mt/statewide.json',
        layer: 'addresses',
        name: 'state'
    }]);
});

test('CI#internaldiff - Internal Diff', async () => {
    const jobs = await CI.internaldiff([{
        filename: 'sources/us/mt/statewide.json',
        raw: 'https://raw.githubusercontent.com/openaddresses/openaddresses/123/sources/us/mt/statewide.json'
    }], async function(url, opts) {
        if (new URL(url).pathname === '/openaddresses/openaddresses/123/sources/us/mt/statewide.json') {
            return new Response(JSON.stringify({
                schema: 2,
                layers: {
                    addresses: [{ name: 'state' }, { name: 'state-other' }, { name: 'no-diff' }],
                    parcels: [{ name: 'state' }]
                }
            }));
        } else if (new URL(url).pathname === '/openaddresses/openaddresses/master/sources/us/mt/statewide.json') {
            return new Response(JSON.stringify({
                schema: 2,
                layers: {
                    addresses: [{ name: 'state', diff: true }, { name: 'no-diff' }]
                }
            }));
        }
    });

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
