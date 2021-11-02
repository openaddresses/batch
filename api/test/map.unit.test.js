const Map = require('../lib/map');
const Job = require('../lib/job');
const test = require('tape');
const Flight = require('./flight');
const nock = require('nock');
const { sql } = require('slonik');

const flight = new Flight();
flight.init(test);
flight.takeoff(test);

test('nocks', (t) => {
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

    t.end();
});

test('Map#get_feature - country', async (t) => {
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
            const job = new Job(
                1,
                'https://github.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/countrywide.json',
                'addresses',
                'fed'
            );
            await job.generate(flight.config.pool);
            job.map = 1;
            await job.commit(flight.config.pool);

            t.deepEquals(await Map.get_feature(flight.config.pool, 'us'), {
                id: 1,
                name: 'United States',
                code: 'us',
                geom: null,
                layers: ['addresses']
            }, 'addresses layer added');
        }

        {
            const job = new Job(
                1,
                'http://github.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/countrywide.json',
                'addresses',
                'fed'
            );
            await job.generate(flight.config.pool);
            job.map = 1;
            await job.commit(flight.config.pool);

            t.deepEquals(await Map.get_feature(flight.config.pool, 'us'), {
                id: 1,
                name: 'United States',
                code: 'us',
                geom: null,
                layers: ['addresses']
            }, 'addresses layer not duplicated');
        }

        {
            const job = new Job(
                1,
                'https://github.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/countrywide.json',
                'buildings',
                'fed'
            );
            await job.generate(flight.config.pool);
            job.map = 1;
            await job.commit(flight.config.pool);

            t.deepEquals(await Map.get_feature(flight.config.pool, 'us'), {
                id: 1,
                name: 'United States',
                code: 'us',
                geom: null,
                layers: ['addresses', 'buildings']
            }, 'additions retain array');
        }
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('Map#match - county', async (t) => {
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
        t.error(err);
    }

    t.deepEquals(await Map.get_feature(flight.config.pool, 'us-42017'), {
        id: 2,
        name: 'Bucks County',
        code: 'us-42017',
        geom: null,
        layers: []
    }, 'no addresses layer');

    {
        const job = new Job(
            1,
            'https://github.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json',
            'addresses',
            'city'
        );
        await job.generate(flight.config.pool);
        await job.commit(flight.config.pool);

        await Map.match(flight.config.pool, job);
        t.deepEquals(await Map.get_feature(flight.config.pool, 'us-42017'), {
            id: 2,
            name: 'Bucks County',
            code: 'us-42017',
            geom: null,
            layers: ['addresses']
        }, 'addresses layer added');
    }

    {
        const job = new Job(
            1,
            'https://github.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json',
            'buildings',
            'city'
        );
        await job.generate(flight.config.pool);
        await job.commit(flight.config.pool);

        await Map.match(flight.config.pool, job);
        t.deepEquals(await Map.get_feature(flight.config.pool, 'us-42017'), {
            id: 2,
            name: 'Bucks County',
            code: 'us-42017',
            geom: null,
            layers: ['addresses', 'buildings']
        }, 'buildings layer added');
    }

    t.end();
});

test('Map#match - country', async (t) => {
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

        t.deepEquals(await Map.get_feature(flight.config.pool, 'ca'), {
            id: 3,
            name: 'Canada',
            code: 'ca',
            geom: null,
            layers: []
        }, 'no addresses layer');

        {
            const job = new Job(
                1,
                'https://github.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/ca/countrywide.json',
                'addresses',
                'countrywide'
            );
            await job.generate(flight.config.pool);
            await job.commit(flight.config.pool);

            await Map.match(flight.config.pool, job);
            t.deepEquals(await Map.get_feature(flight.config.pool, 'ca'), {
                id: 3,
                name: 'Canada',
                code: 'ca',
                geom: null,
                layers: ['addresses']
            }, 'addresses layer added');
        }

        {
            const job = new Job(
                1,
                'https://github.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/ca/countrywide.json',
                'buildings',
                'city'
            );
            await job.generate(flight.config.pool);
            await job.commit(flight.config.pool);

            await Map.match(flight.config.pool, job);
            t.deepEquals(await Map.get_feature(flight.config.pool, 'ca'), {
                id: 3,
                name: 'Canada',
                code: 'ca',
                geom: null,
                layers: ['addresses', 'buildings']
            }, 'buildings layer added');
        }
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('Map#match - geom', async (t) => {
    try {
        {
            const job = new Job(
                1,
                'https://github.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/ca/yk/city_of_whitehorse.json',
                'addresses',
                'city'
            );
            await job.generate(flight.config.pool);
            await job.commit(flight.config.pool);

            await Map.match(flight.config.pool, job);
            t.deepEquals(await Map.get_feature(flight.config.pool, 'd05fd64031aaf953c47310381bc49a64d58a3ee9'), {
                id: 4,
                name: 'ca/yk/city_of_whitehorse',
                code: 'd05fd64031aaf953c47310381bc49a64d58a3ee9',
                geom: '0101000020E610000000000000D0E260C048F84A7D6C5E4E40',
                layers: ['addresses']
            }, 'addresses layer added');
        }

        {
            const job = new Job(
                1,
                'https://github.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/ca/yk/city_of_whitehorse.json',
                'buildings',
                'city'
            );
            await job.generate(flight.config.pool);
            await job.commit(flight.config.pool);

            await Map.match(flight.config.pool, job);
            t.deepEquals(await Map.get_feature(flight.config.pool, 'd05fd64031aaf953c47310381bc49a64d58a3ee9'), {
                id: 4,
                name: 'ca/yk/city_of_whitehorse',
                code: 'd05fd64031aaf953c47310381bc49a64d58a3ee9',
                geom: '0101000020E610000000000000D0E260C048F84A7D6C5E4E40',
                layers: ['addresses', 'buildings']
            }, 'buildings layer added');
        }
    } catch (err) {
        t.error(err);
    }

    t.end();
});

flight.landing(test);

test('end', (t) => {
    nock.cleanAll();
    nock.enableNetConnect();
    t.end();
});
