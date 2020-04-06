'use strict';

process.env.StackName = 'test';

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function init(test) {
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
}

module.exports = init;
