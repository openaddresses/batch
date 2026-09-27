import fs from 'fs';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import Cacher from './lib/cacher.js';
import express from 'express';
import minify from 'express-minify';
import Schema from '@openaddresses/batch-schema';
import Err from '@openaddresses/batch-error';
import { Pool } from '@openaddresses/batch-generic';
import minimist from 'minimist';
import * as pgschema from './lib/schema.js';
import Models from './lib/models.js';

import User from './lib/user.js';
import Token from './lib/token.js';
import { StandardResponse } from './lib/types.js';
import type Config from './lib/config.js';
import type { ConfigArgs } from './lib/config.js';
import type { Server } from 'node:http';

try {
    const dotfile = new URL('.env', import.meta.url);

    fs.accessSync(dotfile);

    Object.assign(process.env, JSON.parse(String(fs.readFileSync(dotfile))));
} catch (err) {
    console.log(`ok - no .env file loaded: ${String(err)}`);
}

const pkg: { version: string } = JSON.parse(String(fs.readFileSync(new URL('./package.json', import.meta.url))));
const args = minimist(process.argv, {
    boolean: ['help', 'populate', 'email', 'no-cache', 'no-migrate', 'silent'],
    alias: {
        no_c: 'no-cache',
    },
    string: ['postgres'],
});

import ConfigClass from './lib/config.js';
import SiteMap from './lib/sitemap.js';

if (import.meta.url === `file://${process.argv[1]}`) {
    configure(args as unknown as ConfigArgs);
}

async function configure(args: ConfigArgs) {
    try {
        return server(await ConfigClass.env(args));
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

/**
 * @apiDefine admin Admin
 *   The user must be an admin to use this endpoint
 */
/**
 * @apiDefine upload Upload
 *   The user must be an admin or have the "upload" flag enabled on their account
 */
/**
 * @apiDefine user User
 *   A user must be logged in to use this endpoint
 */
/**
 * @apiDefine public Public
 *   This API endpoint does not require authentication
 */

export default async function server(config: Config): Promise<[Server, Config]> {
    config.cacher = new Cacher(config.args['no-cache'], config.silent);
    config.pool = await Pool.connect(process.env.POSTGRES || config.args.postgres || 'postgres://postgres@localhost:5432/openaddresses', pgschema, {
        ssl: process.env.StackName === 'test' ? undefined : { rejectUnauthorized: false },
        migrationsFolder: config.args['no-migrate'] ? undefined : new URL('./migrations/', import.meta.url).pathname,
    });

    config.models = new Models(config.pool);

    try {
        if (config.args.populate) {
            await config.models.Map.populate();
        }
    } catch (err) {
        throw err instanceof Error ? err : new Error(String(err));
    }

    const user = new User(config.pool);
    const token = new Token(config.pool);

    const app = express();

    const schema = new Schema(express.Router(), {
        prefix: '/api',
        limit: 50,
        error: {
            400: StandardResponse,
            401: StandardResponse,
            403: StandardResponse,
            404: StandardResponse,
            500: StandardResponse,
        },
        openapi: {
            info: {
                title: 'OpenAddresses Batch API',
                version: pkg.version,
            },
        },
    });

    app.disable('x-powered-by');
    app.use(cors({
        origin: true,
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    }));

    app.use(minify());

    app.get('/api', (req, res) => {
        return res.json({
            version: pkg.version,
        });
    });

    app.get('/sitemap.xml', async (req, res) => {
        try {
            res.type('application/xml');
            res.send(await SiteMap.list(config.pool));
        } catch (err) {
            Err.respond(err, res);
        }
    });

    // API responses are dynamic and should never be cached by the browser or a CDN edge.
    // Routes that stream immutable content (eg map/fabric tiles) set their own Cache-Control
    // header, which takes precedence over this default.
    app.use('/api', (req, res, next) => {
        res.set('Cache-Control', 'no-store');
        next();
    });

    // GitHub signs the raw payload, so it must reach the route as text before the JSON body parser
    app.use('/api/github/event', express.text({ type: '*/*', limit: '500kb' }));

    app.use('/api', schema.router);

    // Unified Auth
    schema.router.use(async (req, res, next) => {
        if (req.header('shared-secret')) {
            if (req.header('shared-secret') !== config.SharedSecret) {
                return res.status(401).json({
                    status: 401,
                    message: 'Invalid shared secret',
                });
            } else {
                req.auth = {
                    uid: false,
                    type: 'secret',
                    level: 'sponsor',
                    username: false,
                    access: 'admin',
                    email: false,
                    flags: {},
                };
            }
        } else if (req.header('authorization')) {
            const authorization = String(req.header('authorization')).split(' ');
            if (authorization[0].toLowerCase() !== 'bearer') {
                return res.status(401).json({
                    status: 401,
                    message: 'Only "Bearer" authorization header is allowed',
                });
            }

            if (authorization[1].split('.')[0] === 'oa') {
                try {
                    const auth = await token.validate(authorization[1]);
                    auth.type = 'token';
                    req.auth = auth;
                } catch (err) {
                    return Err.respond(err, res);
                }
            } else {
                try {
                    const decoded = jwt.verify(authorization[1], config.SharedSecret) as { u: number };
                    const auth = await user.user(decoded.u);
                    auth.type = 'session';
                    req.auth = auth;
                } catch (err) {
                    return res.status(401).json({
                        status: 401,
                        message: err instanceof Error ? err.message : String(err),
                    });
                }
            }
        } else if (req.query.token) {
            try {
                const decoded = jwt.verify(String(req.query.token), config.SharedSecret) as { u: number };
                const t = await user.user(decoded.u);
                t.type = 'token';
                req.token = t;
            } catch (err) {
                console.error(err);
                // Login/Verify uses non-jwt token
            }
        } else {
            req.auth = false;
        }

        return next();
    });

    await schema.api();
    await schema.load(
        new URL('./routes/', import.meta.url),
        config,
        {
            silent: !!config.silent,
        },
    );

    app.get('/docs', (req, res) => {
        res.sendFile(fileURLToPath(new URL('./web/dist/docs.html', import.meta.url)));
    });
    app.use('/{*splat}', express.static('web/dist'));

    return new Promise<[Server, Config]>((resolve, reject) => {
        const srv = app.listen(4999, (err?: Error) => {
            if (err) return reject(err);

            if (!config.silent) console.log('ok - http://localhost:4999');
            return resolve([srv, config]);
        });
    });
}
