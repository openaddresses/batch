import test from 'node:test';
import assert from 'assert';
import Flight from './flight.js';
import { MockAgent, setGlobalDispatcher } from 'undici';
import { sql } from 'drizzle-orm';

const flight = new Flight();
flight.init();
flight.takeoff();

const mockAgent = new MockAgent();

test('mocks', () => {
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);

    const github = mockAgent.get('https://github.com');
    const base = '/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources';
    const headers = { 'content-type': 'application/json' };

    github.intercept({ path: `${base}/us/pa/bucks.json`, method: 'GET' }).reply(200, {
        'schema': 2,
        'coverage': {
            'US Census': {
                'geoid': '42017',
                'name': 'Bucks County',
                'state': 'Pennsylvania'
            },
            'country': 'us',
            'state': 'pa',
            'county': 'Bucks'
        }
    }, { headers }).persist();

    github.intercept({ path: `${base}/us/countrywide.json`, method: 'GET' }).reply(200, {
        'schema': 2,
        'coverage': {
            'country': 'us'
        }
    }, { headers }).persist();

    github.intercept({ path: `${base}/ca/countrywide.json`, method: 'GET' }).reply(200, {
        'schema': 2,
        'coverage': {
            'country': 'ca'
        }
    }, { headers }).persist();

    github.intercept({ path: `${base}/ca/yk/city_of_whitehorse.json`, method: 'GET' }).reply(200, {
        'schema': 2,
        'coverage': {
            'geometry': {
                'type': 'Point',
                'coordinates': [-135.087890625,60.73768583450925]
            },
            'country': 'ca',
            'state': 'yk',
            'town': 'whitehorse'
        }
    }, { headers }).persist();
});

test('Map#get_feature - country', async () => {
    try {
        await flight.config.pool.execute(sql`
            INSERT INTO map (
                name,
                code
            ) VALUES (
                'United States',
                'us'
            );
        `);

        {
            await flight.config.models.Job.generate({
                source: 'https://github.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/countrywide.json',
                layer: 'addresses',
                name: 'fed',
                map: 1
            });

            assert.deepEqual(await flight.config.models.Map.get_feature('us'), {
                id: 1,
                name: 'United States',
                code: 'us',
                geom: null,
                layers: ['addresses']
            });
        }

        {
            await flight.config.models.Job.generate({
                source: 'http://github.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/countrywide.json',
                layer: 'addresses',
                name: 'fed',
                map: 1
            });

            assert.deepEqual(await flight.config.models.Map.get_feature('us'), {
                id: 1,
                name: 'United States',
                code: 'us',
                geom: null,
                layers: ['addresses']
            });
        }

        {
            await flight.config.models.Job.generate({
                source: 'https://github.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/countrywide.json',
                layer: 'buildings',
                name: 'fed',
                map: 1
            });

            assert.deepEqual(await flight.config.models.Map.get_feature('us'), {
                id: 1,
                name: 'United States',
                code: 'us',
                geom: null,
                layers: ['addresses', 'buildings']
            });
        }
    } catch (err) {
        assert.ifError(err);
    }
});

test('Map#match - county', async () => {
    try {
        await flight.config.pool.execute(sql`
            INSERT INTO map (
                name,
                code
            ) VALUES (
                'Bucks County',
                'us-42017'
            );
        `);
    } catch (err) {
        assert.ifError(err);
    }

    assert.deepEqual(await flight.config.models.Map.get_feature('us-42017'), {
        id: 2,
        name: 'Bucks County',
        code: 'us-42017',
        geom: null,
        layers: []
    });

    {
        const job = await flight.config.models.Job.generate({
            source: 'https://github.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json',
            layer: 'addresses',
            name: 'city'
        });

        await flight.config.models.Map.match(job);
        assert.deepEqual(await flight.config.models.Map.get_feature('us-42017'), {
            id: 2,
            name: 'Bucks County',
            code: 'us-42017',
            geom: null,
            layers: ['addresses']
        });
    }

    {
        const job = await flight.config.models.Job.generate({
            source: 'https://github.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json',
            layer: 'buildings',
            name: 'city'
        });

        await flight.config.models.Map.match(job);
        assert.deepEqual(await flight.config.models.Map.get_feature('us-42017'), {
            id: 2,
            name: 'Bucks County',
            code: 'us-42017',
            geom: null,
            layers: ['addresses', 'buildings']
        });
    }
});

test('Map#match - country', async () => {
    try {
        await flight.config.pool.execute(sql`
            INSERT INTO map (
                name,
                code
            ) VALUES (
                'Canada',
                'ca'
            );
        `);

        assert.deepEqual(await flight.config.models.Map.get_feature('ca'), {
            id: 3,
            name: 'Canada',
            code: 'ca',
            geom: null,
            layers: []
        });

        {
            const job = await flight.config.models.Job.generate({
                source: 'https://github.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/ca/countrywide.json',
                layer: 'addresses',
                name: 'countrywide'
            });

            await flight.config.models.Map.match(job);
            assert.deepEqual(await flight.config.models.Map.get_feature('ca'), {
                id: 3,
                name: 'Canada',
                code: 'ca',
                geom: null,
                layers: ['addresses']
            });
        }

        {
            const job = await flight.config.models.Job.generate({
                source: 'https://github.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/ca/countrywide.json',
                layer: 'buildings',
                name: 'city'
            });

            await flight.config.models.Map.match(job);
            assert.deepEqual(await flight.config.models.Map.get_feature('ca'), {
                id: 3,
                name: 'Canada',
                code: 'ca',
                geom: null,
                layers: ['addresses', 'buildings']
            });
        }
    } catch (err) {
        assert.ifError(err);
    }
});

test('Map#match - geom', async () => {
    try {
        {
            const job = await flight.config.models.Job.generate({
                source: 'https://github.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/ca/yk/city_of_whitehorse.json',
                layer: 'addresses',
                name: 'city'
            });

            await flight.config.models.Map.match(job);
            assert.deepEqual(await flight.config.models.Map.get_feature('d05fd64031aaf953c47310381bc49a64d58a3ee9'), {
                id: 4,
                name: 'ca/yk/city_of_whitehorse',
                code: 'd05fd64031aaf953c47310381bc49a64d58a3ee9',
                geom: '0101000020E610000000000000D0E260C048F84A7D6C5E4E40',
                layers: ['addresses']
            });
        }

        {
            const job = await flight.config.models.Job.generate({
                source: 'https://github.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/ca/yk/city_of_whitehorse.json',
                layer: 'buildings',
                name: 'city'
            });

            await flight.config.models.Map.match(job);
            assert.deepEqual(await flight.config.models.Map.get_feature('d05fd64031aaf953c47310381bc49a64d58a3ee9'), {
                id: 4,
                name: 'ca/yk/city_of_whitehorse',
                code: 'd05fd64031aaf953c47310381bc49a64d58a3ee9',
                geom: '0101000020E610000000000000D0E260C048F84A7D6C5E4E40',
                layers: ['addresses', 'buildings']
            });
        }
    } catch (err) {
        assert.ifError(err);
    }
});

test('Map#match - Norway county requires an ISO subdivision', async () => {
    const feature = await flight.config.models.Map.generate({
        name: 'Østfold',
        code: 'no-31'
    });

    for (const scenario of [
        { iso: 'NO-31', matched: true, map: feature.id },
        { iso: undefined, matched: false, map: null }
    ]) {
        const path = '/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/no/31/statewide.json';
        mockAgent.get('https://github.com').intercept({ path, method: 'GET' }).reply(200, {
            schema: 2,
            coverage: {
                country: 'no',
                county: 'Østfold',
                state: 'Østfold',
                'ISO 3166': scenario.iso ? { alpha2: scenario.iso } : undefined
            }
        }, { headers: { 'content-type': 'application/json' } });

        const job = await flight.config.models.Job.generate({
            source: `https://github.com${path}`,
            layer: 'addresses',
            name: 'statewide'
        });

        assert.equal(await flight.config.models.Map.match(job), scenario.matched);
        assert.equal(job.map, scenario.map);
        assert.equal((await flight.config.models.Job.from(job.id)).map, scenario.map);
    }
});

flight.landing();

test('end', async () => {
    await mockAgent.close();
});
