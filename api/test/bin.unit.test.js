'use strict';

const Bin = require('../lib/bin');
const Job = require('../lib/job');
const { Pool } = require('pg');
const test = require('tape');
const init = require('./init');

init(test);

test('Bin#update', async (t) => {
    const pool = new Pool({
        connectionString: 'postgres://postgres@localhost:5432/openaddresses_test'
    });

    try {
        await pool.query(`
            INSERT INTO map (
                name,
                code,
                layers
            ) VALUES (
                'United States',
                'us',
                '{}'
            );
        `);

        await Bin.update(pool, 'us', 'addresses');
        t.deepEquals(await Bin.get_feature(pool, 'us'), {
            name: 'United States',
            code: 'us',
            geom: null,
            layers: ['addresses']
        }, 'addresses layer added');

        await Bin.update(pool, 'us', 'addresses');
        t.deepEquals(await Bin.get_feature(pool, 'us'), {
            name: 'United States',
            code: 'us',
            geom: null,
            layers: ['addresses']
        }, 'addresses layer not duplicated');

        await Bin.update(pool, 'us', 'buildings');
        t.deepEquals(await Bin.get_feature(pool, 'us'), {
            name: 'United States',
            code: 'us',
            geom: null,
            layers: ['addresses', 'buildings']
        }, 'additions retain array');
    } catch (err) {
        t.error(err);
    }

    pool.end();
    t.end();
});

test('Bin#update', async (t) => {
    const pool = new Pool({
        connectionString: 'postgres://postgres@localhost:5432/openaddresses_test'
    });

    try {
        await pool.query(`
            INSERT INTO map (
                name,
                code,
                layers
            ) VALUES (
                'Bucks County',
                '42017',
                '{}'
            );
        `);

        t.deepEquals(await Bin.get_feature(pool, '42017'), {
            name: 'Bucks County',
            code: '42017',
            geom: null,
            layers: []
        }, 'no addresses layer');

        const job = new Job(
            1,
            'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json',
            'addresses',
            'city'
        );

        await Bin.match(pool, job);
        t.deepEquals(await Bin.get_feature(pool, '42017'), {
            name: 'Bucks County',
            code: '42017',
            geom: null,
            layers: ['addresses']
        }, 'addresses layer added');
    } catch (err) {
        t.error(err);
    }

    pool.end();
    t.end();
});
