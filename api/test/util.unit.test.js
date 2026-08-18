import { explode } from '../lib/util.js';
import test from 'node:test';
import assert from 'assert';
import { MockAgent, setGlobalDispatcher } from 'undici';

test('explode() merges layer license + website into the job spec', async () => {
    const url = 'https://raw.githubusercontent.com/openaddresses/openaddresses/testsha1/sources/ca/mb/brandon.json';

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

    const jobs = await explode(url);

    assert.deepEqual(jobs, [{
        source: url,
        layer: 'addresses',
        name: 'city',
        license: {
            url: 'https://opendata.brandon.ca/terms.aspx',
            'attribution name': 'City of Brandon',
            text: 'Contains public sector Datasets made available under the City of Brandon\'s Open Data Licence',
            website: 'https://opengov.brandon.ca/OpenDataService/opendata.html'
        }
    }], 'job spec includes merged license + website');
});

test('explode() sets license to undefined when the layer has none', async () => {
    const url = 'https://raw.githubusercontent.com/openaddresses/openaddresses/testsha2/sources/us/xx/nolicense.json';

    const mockAgent = new MockAgent();
    setGlobalDispatcher(mockAgent);

    const mockPool = mockAgent.get('https://raw.githubusercontent.com');
    mockPool
        .intercept({
            path: '/openaddresses/openaddresses/testsha2/sources/us/xx/nolicense.json',
            method: 'GET'
        })
        .reply(200, {
            schema: 2,
            coverage: { country: 'us' },
            layers: {
                addresses: [{ name: 'city' }]
            }
        });

    const jobs = await explode(url);

    assert.deepEqual(jobs, [{
        source: url,
        layer: 'addresses',
        name: 'city',
        license: undefined
    }], 'job spec has no license');
});
