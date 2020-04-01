'use strict';

const Bin = require('../lib/bin');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const test = require('tape');

test('start', async (t) => {
    let pool = new Pool({
        connectionString: 'postgres://postgres@localhost:5432/postgres'
    });

    try {
        await pool.query('DROP DATABASE IF EXISTS openaddresses_test');
        await pool.query('CREATE DATABASE openaddresses_test');
        await pool.end();
    } catch (err) {
        t.error(err);
    }

    pool = new Pool({
        connectionString: 'postgres://postgres@localhost:5432/openaddresses_test'
    });

    try {
        await pool.query(String(fs.readFileSync(path.resolve(__dirname, '../schema.sql'))));
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
