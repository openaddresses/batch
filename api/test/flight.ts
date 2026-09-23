process.env.StackName = 'test';

import { fetch } from 'undici';
import type { Response } from 'undici';
import test from 'node:test';
import assert from 'assert';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import Config from '../lib/config.js';
import type { Server } from 'node:http';
import drop from './drop.js';
import { pathToRegexp } from 'path-to-regexp';
import Ajv from 'ajv';
import api from '../index.js';

interface AjvValidate {
    (data: unknown): boolean;
    errors?: Array<{ schemaPath: string; message?: string }> | null;
}
interface AjvInstance {
    compile(schema: object): AjvValidate;
}

const ajv = new (Ajv as unknown as new (opts: object) => AjvInstance)({
    allErrors: true,
});

export interface FlightRequest {
    method?: string;
    headers?: Record<string, string>;
    // Test bodies/options are intentionally dynamic per-endpoint
    body?: unknown;
    json?: boolean;
    redirect?: string;
    auth?: {
        bearer?: string;
        username?: string;
        password?: string;
    };
    [k: string]: unknown;
}

export type FlightFetchOpts = boolean | { verify?: boolean; json?: boolean };

/**
 * @class
 */
class FlightResponse {
    res: Response;
    ok: boolean;
    headers: Response['headers'];
    status: number;
    // Response bodies vary per-endpoint in tests
    body: any;

    constructor(res: Response, body: unknown) {
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
    srv!: Server;
    base: string | false;
    token: Record<string, string>;
    config!: Config;
    schema!: Record<string, { res?: object }>;
    routes!: Record<string, RegExp>;

    constructor() {
        this.base = false;
        this.token = {};
    }

    /**
     * Clear the database - the schema is recreated by the migrations run on server takeoff
     */
    init(): void {
        test('start: database', async () => {
            try {
                await drop();
            } catch (err) {
                assert.ifError(err);
            }

            this.schema = JSON.parse(String(fs.readFileSync(new URL('./fixtures/get_schema.json', import.meta.url))));
            this.routes = {};

            for (const route of Object.keys(this.schema)) {
                this.routes[route] = new RegExp(pathToRegexp(route.split(' ').join(' /api')) as unknown as string);
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
    async fetch(url: string, req: FlightRequest, t?: FlightFetchOpts): Promise<FlightResponse> {
        if (t === undefined) throw new Error('flight.request requires two arguments - pass (<url>, <req>, false) to disable schema testing');

        const defs = {
            verify: false,
            json: true,
        };

        if (t === true) {
            defs.verify = true;
        } else if (t === false) {
            defs.verify = false;
        } else {
            Object.assign(defs, t);
        }

        const target = new URL(url, this.base || undefined);

        const headers = req.headers = req.headers ?? {};
        if (req.body && (req.body as object).constructor === Object) {
            headers['Content-Type'] = 'application/json';
            req.body = JSON.stringify(req.body);
        }

        if (req.auth && req.auth.bearer) {
            headers['Authorization'] = `Bearer ${req.auth.bearer}`;
        } else if (req.auth && req.auth.username && req.auth.password) {
            headers['Authorization'] = 'Basic ' + btoa(req.auth.username + ':' + req.auth.password);
        }

        delete req.auth;

        if (!defs.verify) {
            const _res = await fetch(target, req as Parameters<typeof fetch>[1]);
            const body = defs.json ? await _res.json() : await _res.text();
            const res = new FlightResponse(_res, body);
            return res;
        }

        if (!req.method) req.method = 'GET';

        let match = '';
        const spath = `${req.method.toUpperCase()} ${target.pathname}/`;

        const matches: string[] = [];
        for (const r of Object.keys(this.routes)) {
            if (spath.match(this.routes[r])) {
                matches.push(r);
            }
        }

        if (!matches.length) {
            assert.fail(`Cannot find schema match for: ${spath}`);
        } else if (matches.length === 1) {
            match = matches[0];
        } else {
            // TODO multiple selection - default to first one defined in routes to mirror express behabior
            match = matches[0];
        }

        const schemaurl = new URL('/api/schema', this.base || undefined);
        schemaurl.searchParams.append('method', match.split(' ')[0]);
        schemaurl.searchParams.append('url', match.split(' ')[1]);

        const rawschema = await (await fetch(schemaurl)).json() as { res?: object };

        if (!rawschema.res) throw new Error('Cannot validate resultant schema - no result schema defined');

        const schema = ajv.compile(rawschema.res);

        const _res = await fetch(target, req as Parameters<typeof fetch>[1]);
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
    takeoff(custom: Record<string, unknown> = {}): void {
        test('test server takeoff', async () => {
            const srv = await api(await Config.env(Object.assign({
                'postgres': 'postgres://postgres@localhost:5432/openaddresses_test',
                'no-cache': true,
                'silent': true,
                'test': true,
            }, custom)));

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
    user(username: string, admin = false, opts: { level?: string } = {}): void {
        test('Create Token', async () => {
            try {
                const res = await fetch(new URL('/api/user', this.base || undefined), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: username,
                        password: username,
                        email: `${username}@openaddresses.io`,
                    }),
                });

                const new_user = new FlightResponse(res, await res.json());

                if (new_user.status !== 200) throw new Error(JSON.stringify(new_user.body));

                await this.config.pool.execute(sql`
                     UPDATE users
                        SET
                            validated = True
                        WHERE
                            id = ${new_user.body.id}
                `);

                if (admin) {
                    await this.config.pool.execute(sql`
                         UPDATE users
                            SET
                                access = 'admin'

                            WHERE
                                id = ${new_user.body.id}
                    `);
                }

                if (opts.level) {
                    await this.config.pool.execute(sql`
                         UPDATE users
                            SET
                                level = ${opts.level}
                            WHERE
                                id = ${new_user.body.id}
                    `);
                }

                const new_login = await fetch(new URL('/api/login', this.base || undefined), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: username,
                        password: username,
                    }),
                });

                this.token[username] = (await new_login.json() as { token: string }).token;
            } catch (err) {
                assert.ifError(err);
            }
        });
    }

    /**
     * Shutdown an existing server test instance
     */
    landing(): void {
        test('test server landing - api', () => {
            this.srv.close(async () => {
                await this.config.pool.end();
                await this.config.cacher.cache.quit();
                delete (this as Record<string, unknown>).config;
                delete (this as Record<string, unknown>).srv;
            });
        });
    }
}
