'use strict';

const Map = require('../lib/map');
const Job = require('../lib/job');
const { Pool } = require('pg');
const test = require('tape');
const init = require('./init');
const nock = require('nock');

init(test);

test('Map#get_feature - country', async (t) => {
    const pool = new Pool({
        connectionString: 'postgres://postgres@localhost:5432/openaddresses_test'
    });

    try {
        await pool.query(`
            INSERT INTO map (
                name,
                code
            ) VALUES (
                'United States',
                'us'
            );
        `);

        {
            nock('raw.githubusercontent.com')
                .get('/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/countrywide.json')
                .reply(200, {
                    "schema": 2,
                    "coverage": {
                        "country": "us"
                    }
                });

            const job = new Job(
                1,
                'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/countrywide.json',
                'addresses',
                'fed'
            );
            await job.generate(pool);
            job.map = 1;
            await job.commit(pool);

            t.deepEquals(await Map.get_feature(pool, 'us'), {
                id: 1,
                name: 'United States',
                code: 'us',
                geom: null,
                layers: ['addresses']
            }, 'addresses layer added');
        }

        {
            nock('raw.githubusercontent.com')
                .get('/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/countrywide.json')
                .reply(200, {
                    "schema": 2,
                    "coverage": {
                        "country": "us"
                    }
                });

            const job = new Job(
                1,
                'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/countrywide.json',
                'addresses',
                'fed'
            );
            await job.generate(pool);
            job.map = 1;
            await job.commit(pool);

            t.deepEquals(await Map.get_feature(pool, 'us'), {
                id: 1,
                name: 'United States',
                code: 'us',
                geom: null,
                layers: ['addresses']
            }, 'addresses layer not duplicated');
        }

        {
            nock('raw.githubusercontent.com')
                .get('/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/countrywide.json')
                .reply(200, {
                    "schema": 2,
                    "coverage": {
                        "country": "us"
                    }
                });

            const job = new Job(
                1,
                'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/countrywide.json',
                'buildings',
                'fed'
            );
            await job.generate(pool);
            job.map = 1;
            await job.commit(pool);

            t.deepEquals(await Map.get_feature(pool, 'us'), {
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

    pool.end();
    t.end();
});

test('Map#match - county', async (t) => {
    const pool = new Pool({
        connectionString: 'postgres://postgres@localhost:5432/openaddresses_test'
    });

    try {
        await pool.query(`
            INSERT INTO map (
                name,
                code
            ) VALUES (
                'Bucks County',
                'us-42017'
            );
        `);

        t.deepEquals(await Map.get_feature(pool, 'us-42017'), {
            id: 2,
            name: 'Bucks County',
            code: 'us-42017',
            geom: null,
            layers: []
        }, 'no addresses layer');

        {
            nock('raw.githubusercontent.com')
                .get('/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json')
                .reply(200, {
                    "schema": 2,
                    "coverage": {
                        "US Census": {
                            "geoid": "42017",
                            "name": "Bucks County",
                            "state": "Pennsylvania"
                        },
                        "country": "us",
                        "state": "pa",
                        "county": "Bucks"
                    }
                });

            const job = new Job(
                1,
                'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json',
                'addresses',
                'city'
            );
            await job.generate(pool);
            job.map = 2;
            await job.commit(pool);

            await Map.match(pool, job);
            t.deepEquals(await Map.get_feature(pool, 'us-42017'), {
                id: 2,
                name: 'Bucks County',
                code: 'us-42017',
                geom: null,
                layers: ['addresses']
            }, 'addresses layer added');
        }

        {
            nock('raw.githubusercontent.com')
                .get('/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json')
                .reply(200, {
                    "schema": 2,
                    "coverage": {
                        "US Census": {
                            "geoid": "42017",
                            "name": "Bucks County",
                            "state": "Pennsylvania"
                        },
                        "country": "us",
                        "state": "pa",
                        "county": "Bucks"
                    }
                });

            const job = new Job(
                1,
                'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json',
                'buildings',
                'city'
            );
            await job.generate(pool);
            job.map = 2;
            await job.commit(pool);

            await Map.match(pool, job);
            t.deepEquals(await Map.get_feature(pool, 'us-42017'), {
                id: 2,
                name: 'Bucks County',
                code: 'us-42017',
                geom: null,
                layers: ['addresses', 'buildings']
            }, 'buildings layer added');
        }
    } catch (err) {
        t.error(err);
    }

    pool.end();
    t.end();
});

test('Map#match - country', async (t) => {
    const pool = new Pool({
        connectionString: 'postgres://postgres@localhost:5432/openaddresses_test'
    });

    try {
        await pool.query(`
            INSERT INTO map (
                name,
                code
            ) VALUES (
                'Canada',
                'ca'
            );
        `);

        t.deepEquals(await Map.get_feature(pool, 'ca'), {
            id: 3,
            name: 'Canada',
            code: 'ca',
            geom: null,
            layers: []
        }, 'no addresses layer');

        {
            const job = new Job(
                1,
                'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/ca/countrywide.json',
                'addresses',
                'countrywide'
            );
            await job.generate(pool);
            job.map = 3;
            await job.commit(pool);

            await Map.match(pool, job);
            t.deepEquals(await Map.get_feature(pool, 'ca'), {
                id: 3,
                name: 'Canada',
                code: 'ca',
                geom: null,
                layers: ['addresses']
            }, 'addresses layer added');
        }

        {
            nock('raw.githubusercontent.com')
                .get('/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/ca/countrywide.json')
                .reply(200, {
                    "schema": 2,
                    "coverage": {
                        "country": "ca"
                    }
                });

            const job = new Job(
                1,
                'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/ca/countrywide.json',
                'buildings',
                'city'
            );
            await job.generate(pool);
            job.map = 3;
            await job.commit(pool);

            await Map.match(pool, job);
            t.deepEquals(await Map.get_feature(pool, 'ca'), {
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

    pool.end();
    t.end();
});

test('close', (t) => {
    nock.cleanAll();
    t.end();
});
