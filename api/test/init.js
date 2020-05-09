'use strict';

process.env.StackName = 'test';

const fs = require('fs');
const path = require('path');
const request = require('request');
const { Pool } = require('pg');

/**
 * Clear and restore an empty database schema
 *
 * @param {Tape} test Tape test instance
 */
function init(test) {
    test('start: database', async (t) => {
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

async function token() {
    return new Promise((resolve, reject) => {
        request({
            url: 'http://localhost:5000/api/user',
            json: true,
            method: 'POST',
            body: {
                username: 'test',
                password: 'test',
                email: 'test@openaddresses.io'
            }
        }, (err, res) => {
            if (err) return reject(err);
            if (res.statusCode !== 200) return reject(res.body);

            request({
                url: 'http://localhost:5000/api/login',
                json: true,
                method: 'POST',
                body: {
                    username: 'test',
                    password: 'test'
                }
            }, (err, res) => {
                if (err) return reject(err);
                if (res.statusCode !== 200) return reject(res.body);

                console.error(res.headers);
            });
        });
    });
}

module.exports = {
    init,
    token
};
