'use strict';

process.env.StackName = 'test';

const fs = require('fs');
const path = require('path');
const request = require('request');
const { Pool } = require('pg');
const api = require('../index');

class Flight {

    constructor() {
        this.srv;
        this.pool;
    }

    /**
     * Bootstrap a new server test instance
     *
     * @param {Tape} test tape instance to run takeoff action on
     */
    takeoff(test) {
        test('test server takeoff', (t) => {
            api({
                postgres: 'postgres://postgres@localhost:5432/openaddresses_test'
            }, (srv, pool) => {
                t.ok(srv, 'server object returned');
                t.ok(pool, 'pool object returned');

                this.srv = srv;
                this.pool = pool;

                t.end();
            });
        });
    } 

    /**
     * Clear and restore an empty database schema
     *
     * @param {Tape} test Tape test instance
     */
    init(test) {
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

    async token() {
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

    /**
     * Shutdown an existing server test instance
     *
     * @param {Tape} test tape instance to run landing action on
     */
    landing(test) {
        test('test server landing - api', async (t) => {
            t.ok(this.srv, 'server object returned');
            t.ok(this.pool, 'pool object returned');

            await this.pool.end();
            await this.srv.close();

            t.end();
        });
    }
}

module.exports = Flight;
