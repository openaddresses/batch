'use strict';

process.env.StackName = 'test';

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const request = promisify(require('request'));
const { Pool } = require('pg');
const api = require('../index');

class Flight {

    constructor() {
        this.srv;
        this.pool;
        this.config;
    }

    /**
     * Clear and restore an empty database schema
     *
     * @param {Tape} test Tape test instance
     * @param {Boolean} keep_open Should the database connection remain open
     */
    init(test, keep_open = false) {
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

            if (keep_open) {
                this.pool = pool;
            } else {
                pool.end();
            }

            t.end();
        });
    }

    /**
     * Bootstrap a new server test instance
     *
     * @param {Tape} test tape instance to run takeoff action on
     */
    takeoff(test, custom = {}) {
        test('test server takeoff', (t) => {
            api(Object.assign({
                postgres: 'postgres://postgres@localhost:5432/openaddresses_test',
                'no-cache': true
            }, custom), (srv, config) => {
                t.ok(srv, 'server object returned');
                t.ok(config, 'config object returned');
                t.ok(config.pool, 'pool object returned');

                this.srv = srv;
                this.pool = config.pool;
                this.config = config;

                t.end();
            });
        });
    }

    /**
     * Create a new user and return an API token for that user
     *
     * @param {String} username Username for user to create
     * @param {Object} opts
     * @param {String} opts.level
     */
    async token(username, opts = {}) {
        if (!opts.level) opts.level = 'basic';

        const jar = request.jar();

        const new_user = await request({
            url: 'http://localhost:4999/api/user',
            json: true,
            jar: jar,
            method: 'POST',
            body: {
                username: username,
                password: 'test',
                email: `${username}@openaddresses.io`
            }
        });

        if (new_user.statusCode !== 200) throw new Error(new_user.body);

        await this.pool.query(`
             UPDATE users
                SET
                    validated = True,
                    level = $1
        `, [
            opts.level
        ]);

        const new_login = await request({
            url: 'http://localhost:4999/api/login',
            json: true,
            method: 'POST',
            jar: jar,
            body: {
                username: username,
                password: 'test'
            }
        });

        if (new_login.statusCode !== 200) throw new Error(new_login.body);

        const new_token = await request({
            url: 'http://localhost:4999/api/token',
            json: true,
            method: 'POST',
            jar: jar,
            body: {
                name: 'test'
            }
        });

        if (new_token.statusCode !== 200) throw new Error(new_token.body);

        return {
            jar: jar,
            user: new_user.body,
            token: new_token.body
        };
    }

    /**
     * Shutdown an existing server test instance
     *
     * @param {Tape} test tape instance to run landing action on
     */
    landing(test) {
        test('test server landing - api', async (t) => {
            if (this.srv) {
                t.ok(this.srv, 'server object returned');
                await this.srv.close();
            }

            t.ok(this.pool, 'pool object returned');
            await this.pool.end();

            await this.config.cacher.cache.quit();

            t.end();
        });
    }
}

module.exports = Flight;
