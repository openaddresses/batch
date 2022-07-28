process.env.StackName = 'test';

import test from 'node:test';
import assert from 'assert';
import { sql } from 'slonik';
import fs from 'fs';
import Knex from 'knex';
import KnexConfig from '../knexfile.js';
import drop from './drop.js';
import { pathToRegexp } from 'path-to-regexp';
import Ajv from 'ajv';
import api from '../index.js';

const ajv = new Ajv({
    allErrors: true
});

/**
 * @class
 */
class FlightResponse {
    constructor(res, body) {
        this.res = res;

        this.ok = res.ok;
        this.headers = res.headers;
        this.status = res.status;
        this.body = body;
    }
}

/**
 * @class
 */
export default class Flight {
    constructor() {
        this.srv;
        this.base = false;
        this.token = {};
        this.config;
    }

    /**
     * Clear and restore an empty database schema
     */
    init() {
        test('start: database', async () => {
            try {
                await drop();
                KnexConfig.connection = process.env.Postgres || 'postgres://postgres@localhost:5432/openaddresses_test';
                const knex = Knex(KnexConfig);
                await knex.migrate.latest();
                await knex.destroy();
            } catch (err) {
                assert.ifError(err);
            }

            this.schema = JSON.parse(fs.readFileSync(new URL('./fixtures/get_schema.json', import.meta.url)));
            this.routes = {};

            for (const route of Object.keys(this.schema)) {
                this.routes[route] = new RegExp(pathToRegexp(route.split(' ').join(' /api')));
            }
        });
    }

    /**
     * Request data from the API & Ensure the output schema matches the response
     *
     * @param {String} url URL to request
     * @param {Object} req Request Object
     * @param {boolean|object} t If true validate schema & use defaults. If false, don't validate schema and use defaults
     * @param {boolean} [t.verify] Verify Schema Validation
     * @param {boolean} [t.json=true] Expect JSON in response
     */
    async fetch(url, req, t) {
        if (t === undefined) throw new Error('flight.request requires two arguments - pass (<url>, <req>, false) to disable schema testing');

        const defs = {
            verify: false,
            json: true
        };

        if (t === true) {
            defs.verify = true;
        } else if (t === false) {
            defs.verify = false;
        } else {
            Object.assign(defs, t);
        }

        url = new URL(url, this.base);

        if (!req.headers) req.headers = {};
        if (req.body && req.body.constructor === Object) {
            req.headers['Content-Type'] = 'application/json';
            req.body = JSON.stringify(req.body);
        }

        if (req.auth && req.auth.bearer) {
            req.headers['Authorization'] = `Bearer ${req.auth.bearer}`;
        } else if (req.auth && req.auth.username && req.auth.password) {
            req.headers['Authorization'] = 'Basic ' + btoa(req.auth.username + ':' + req.auth.password);
        }

        delete req.auth;

        if (!defs.verify) {
            const _res = await fetch(url, req);
            const body = defs.json ? await _res.json() : await _res.text();
            const res = new FlightResponse(_res, body);
            return res;
        }

        if (!req.method) req.method = 'GET';

        let match = false;
        const spath = `${req.method.toUpperCase()} ${url.pathname}/`;

        const matches = [];
        for (const r of Object.keys(this.routes)) {
            if (spath.match(this.routes[r])) {
                matches.push(r);
            }
        }

        if (!matches.length) {
            assert.fail(`Cannot find schema match for: ${spath}`);
            return;
        } else if (matches.length === 1) {
            match = matches[0];
        } else {
            // TODO multiple selection - default to first one defined in routes to mirror express behabior
            match = matches[0];
        }

        const schemaurl = new URL('/api/schema', this.base);
        schemaurl.searchParams.append('method', match.split(' ')[0]);
        schemaurl.searchParams.append('url', match.split(' ')[1]);

        const rawschema = await (await fetch(schemaurl)).json();

        if (!rawschema.res) throw new Error('Cannot validate resultant schema - no result schema defined');

        const schema = ajv.compile(rawschema.res);

        const _res = await fetch(url, req);
        const res = new FlightResponse(_res, await _res.json());

        if (res.ok) {
            schema(res.body);

            if (!schema.errors) return res;

            for (const error of schema.errors) {
                assert.fail(`${error.schemaPath}: ${error.message}`);
            }
        } else {
            // Just print the body instead of spewing
            // 100 schema validation errors for an error response
            assert.fail(JSON.stringify(res.body));
        }

        return res;
    }

    /**
     * Bootstrap a new server test instance
     *
     * @param {Object} custom custom config options
     */
    takeoff(custom = {}) {
        test('test server takeoff', async () => {
            const srv = await api(Object.assign({
                postgres: 'postgres://postgres@localhost:5432/openaddresses_test',
                'no-cache': true,
                'no-tilebase': true,
                silent: true,
                test: true
            }, custom));

            assert.equal(srv.length, 2);

            this.srv = srv[0];
            this.config = srv[1];

            this.base = 'http://localhost:4999';
        });
    }

    /**
     * Create a new user and return an API token for that user
     *
     * @param {String} username Username for user to create
     * @param {boolean} admin Should the user be set to admin
     * @param {Object} opts Optional Objects
     * @param {String} [opts.level=basic]
     */
    user(username, admin = false, opts = {}) {
        test('Create Token', async () => {
            try {
                const res = await fetch(new URL('/api/user', this.base), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: username,
                        password: username,
                        email: `${username}@openaddresses.io`
                    })
                });

                const new_user = new FlightResponse(res, await res.json());

                if (new_user.status !== 200) throw new Error(JSON.stringify(new_user.body));

                await this.config.pool.query(sql`
                     UPDATE users
                        SET
                            validated = True
                        WHERE
                            id = ${new_user.body.id}
                `);

                if (admin) {
                    await this.config.pool.query(sql`
                         UPDATE users
                            SET
                                access = 'admin'

                            WHERE
                                id = ${new_user.body.id}
                    `);
                }

                if (opts.level) {
                    await this.config.pool.query(sql`
                         UPDATE users
                            SET
                                level = ${opts.level}
                            WHERE
                                id = ${new_user.body.id}
                    `);
                }

                const new_login = await fetch(new URL('/api/login', this.base), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: username,
                        password: username
                    })
                });

                this.token[username] = (await new_login.json()).token;
            } catch (err) {
                assert.ifError(err);
            }
        });
    }

    /**
     * Shutdown an existing server test instance
     */
    landing() {
        test('test server landing - api', (t) => {
            this.srv.close(async () => {
                await this.config.pool.end();
                delete this.config;
                delete this.srv;
                t.end();
            });
        });
    }
}
