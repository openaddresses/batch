import Map from '../lib/types/map.js';
import Job from '../lib/types/job.js';
import test from 'node:test';
import assert from 'assert';
import Flight from './flight.js';
import nock from 'nock';
import { sql } from 'slonik';

const flight = new Flight();
flight.init();
flight.takeoff();

test('nocks', () => {
    nock.disableNetConnect();

    nock('https://github.com')
        .persist()
        .get('/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json')
        .reply(200, {
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
        })
        .get('/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/countrywide.json')
        .reply(200, {
            'schema': 2,
            'coverage': {
                'country': 'us'
            }
        })
        .get('/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/ca/countrywide.json')
        .reply(200, {
            'schema': 2,
            'coverage': {
                'country': 'ca'
            }
        })
        .get('/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/ca/yk/city_of_whitehorse.json')
        .reply(200, {
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
        });
});

test('Map#get_feature - country', async () => {
    try {
        await flight.config.pool.query(sql`
            INSERT INTO map (
                name,
                code
            ) VALUES (
                'United States',
                'us'
            );
        `);

        {
            await Job.generate(flight.config.pool, {
                source: 'https://github.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/countrywide.json',
                layer: 'addresses',
                name: 'fed',
                map: 1
            });

            assert.deepEqual(await Map.get_feature(flight.config.pool, 'us'), {
                id: 1,
                name: 'United States',
                code: 'us',
                geom: null,
                layers: ['addresses']
            });
        }

        {
            await Job.generate(flight.config.pool, {
                source: 'http://github.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/countrywide.json',
                layer: 'addresses',
                name: 'fed',
                map: 1
            });

            assert.deepEqual(await Map.get_feature(flight.config.pool, 'us'), {
                id: 1,
                name: 'United States',
                code: 'us',
                geom: null,
                layers: ['addresses']
            });
        }

        {
            await Job.generate(flight.config.pool, {
                source: 'https://github.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/countrywide.json',
                layer: 'buildings',
                name: 'fed',
                map: 1
            });

            assert.deepEqual(await Map.get_feature(flight.config.pool, 'us'), {
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
        await flight.config.pool.query(sql`
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

    assert.deepEqual(await Map.get_feature(flight.config.pool, 'us-42017'), {
        id: 2,
        name: 'Bucks County',
        code: 'us-42017',
        geom: null,
        layers: []
    });

    {
        const job = await Job.generate(flight.config.pool, {
            source: 'https://github.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json',
            layer: 'addresses',
            name: 'city'
        });

        await Map.match(flight.config.pool, job);
        assert.deepEqual(await Map.get_feature(flight.config.pool, 'us-42017'), {
            id: 2,
            name: 'Bucks County',
            code: 'us-42017',
            geom: null,
            layers: ['addresses']
        });
    }

    {
        const job = await Job.generate(flight.config.pool, {
            source: 'https://github.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json',
            layer: 'buildings',
            name: 'city'
        });

        await Map.match(flight.config.pool, job);
        assert.deepEqual(await Map.get_feature(flight.config.pool, 'us-42017'), {
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
        await flight.config.pool.query(sql`
            INSERT INTO map (
                name,
                code
            ) VALUES (
                'Canada',
                'ca'
            );
        `);

        assert.deepEqual(await Map.get_feature(flight.config.pool, 'ca'), {
            id: 3,
            name: 'Canada',
            code: 'ca',
            geom: null,
            layers: []
        });

        {
            const job = await Job.generate(flight.config.pool, {
                source: 'https://github.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/ca/countrywide.json',
                layer: 'addresses',
                name: 'countrywide'
            });

            await Map.match(flight.config.pool, job);
            assert.deepEqual(await Map.get_feature(flight.config.pool, 'ca'), {
                id: 3,
                name: 'Canada',
                code: 'ca',
                geom: null,
                layers: ['addresses']
            });
        }

        {
            const job = await Job.generate(flight.config.pool, {
                source: 'https://github.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/ca/countrywide.json',
                layer: 'buildings',
                name: 'city'
            });

            await Map.match(flight.config.pool, job);
            assert.deepEqual(await Map.get_feature(flight.config.pool, 'ca'), {
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
            const job = await Job.generate(flight.config.pool, {
                source: 'https://github.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/ca/yk/city_of_whitehorse.json',
                layer: 'addresses',
                name: 'city'
            });

            await Map.match(flight.config.pool, job);
            assert.deepEqual(await Map.get_feature(flight.config.pool, 'd05fd64031aaf953c47310381bc49a64d58a3ee9'), {
                id: 4,
                name: 'ca/yk/city_of_whitehorse',
                code: 'd05fd64031aaf953c47310381bc49a64d58a3ee9',
                geom: '0101000020E610000000000000D0E260C048F84A7D6C5E4E40',
                layers: ['addresses']
            });
        }

        {
            const job = await Job.generate(flight.config.pool, {
                source: 'https://github.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/ca/yk/city_of_whitehorse.json',
                layer: 'buildings',
                name: 'city'
            });

            await Map.match(flight.config.pool, job);
            assert.deepEqual(await Map.get_feature(flight.config.pool, 'd05fd64031aaf953c47310381bc49a64d58a3ee9'), {
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

flight.landing();

test('end', () => {
    nock.cleanAll();
    nock.enableNetConnect();
});
