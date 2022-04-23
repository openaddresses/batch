import fs from 'fs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import Cacher from './lib/cacher.js';
import morgan from 'morgan';
import express from 'express';
import minify from 'express-minify';
import bodyparser from 'body-parser';
import { Schema, Err } from '@openaddresses/batch-schema';
import { sql, createPool, createTypeParserPreset } from 'slonik';
import wkx from 'wkx';
import bbox from '@turf/bbox';
import minimist from 'minimist';

import User from './lib/user.js';
import Token from './lib/token.js';


const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url)));
const args = minimist(process.argv, {
    boolean: ['help', 'populate', 'email', 'no-cache', 'no-tilebase', 'silent'],
    alias: {
        no_tb: 'no-tilebase',
        no_c: 'no-cache'
    },
    string: ['postgres']
});

import Config from './lib/config.js';
import SiteMap from './lib/sitemap.js';

if (import.meta.url === `file://${process.argv[1]}`) {
    configure(args);
}

export default async function configure(args, cb) {
    try {
        return server(args, await Config.env(args), cb);
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

async function server(args, config) {
    const TileBase = (await import('tilebase')).default;

    if (!args['no-tilebase']) {
        try {
            if (!config.silent) console.log(`ok - loading: s3://${config.Bucket}/${config.StackName}/fabric.tilebase`);
            config.tb = new TileBase(`s3://${config.Bucket}/${config.StackName}/fabric.tilebase`);
            if (!config.silent) console.log('ok - loaded TileBase (Fabric)');
            await config.tb.open();
        } catch (err) {
            console.error(err);
            config.tb = null;
        }

        try {
            if (!config.silent) console.log(`ok - loading: s3://${config.Bucket}/${config.StackName}/borders.tilebase`);
            config.borders = new TileBase(`s3://${config.Bucket}/${config.StackName}/borders.tilebase`);
            if (!config.silent) console.log('ok - loaded TileBase (Borders)');
            await config.borders.open();
        } catch (err) {
            console.error(err);
            config.borders = null;
        }
    } else {
        if (!config.silent) console.log('ok - TileBase Disabled');
    }

    let postgres = process.env.POSTGRES;

    if (args.postgres) {
        postgres = args.postgres;
    } else if (!postgres) {
        postgres = 'postgres://postgres@localhost:5432/openaddresses';
    }

    let pool = false;
    let retry = 5;
    do {
        try {
            pool = createPool(postgres, {
                typeParsers: [
                    ...createTypeParserPreset(), {
                        name: 'geometry',
                        parse: (value) => {
                            const geom = wkx.Geometry.parse(Buffer.from(value, 'hex')).toGeoJSON();

                            geom.bounds = bbox(geom);

                            return geom;
                        }
                    }
                ]
            });

            await pool.query(sql`SELECT NOW()`);
        } catch (err) {
            pool = false;

            if (retry === 0) {
                console.error('not ok - terminating due to lack of postgres connection');
                return process.exit(1);
            }

            retry--;
            console.error('not ok - unable to get postgres connection');
            console.error(`ok - retrying... (${5 - retry}/5)`);
            await sleep(5000);
        }
    } while (!pool);

    config.cacher = new Cacher(args['no-cache'], config.silent);
    config.pool = pool;

    try {
        if (args.populate) {
            await Map.populate(pool);
        }
    } catch (err) {
        throw new Error(err);
    }

    const user = new User(pool);
    const token = new Token(pool);

    const app = express();

    const schema = new Schema(express.Router(), {
        schemas: String(new URL('./schema', import.meta.url)).replace('file://', '')
    });

    app.disable('x-powered-by');
    app.use(cors({
        origin: true,
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    }));

    app.use(minify());

    app.use(express.static('web/dist'));

    /**
     * @api {get} /api Get Metadata
     * @apiVersion 1.0.0
     * @apiName Meta
     * @apiGroup Server
     * @apiPermission public
     *
     * @apiDescription
     *     Return basic metadata about server configuration
     *
     * @apiSchema {jsonschema=./schema/res.Meta.json} apiSuccess
     */
    app.get('/api', (req, res) => {
        return res.json({
            version: pkg.version
        });
    });

    app.get('/sitemap.xml', async (req, res) => {
        try {
            res.type('application/xml');
            res.send(await SiteMap.list(config.pool));
        } catch (err) {
            Err.respond(res, err);
        }
    });

    /**
     * @api {get} /health Server Healthcheck
     * @apiVersion 1.0.0
     * @apiName Health
     * @apiGroup Server
     * @apiPermission public
     *
     * @apiDescription
     *     AWS ELB Healthcheck for the server
     *
     * @apiSchema {jsonschema=./schema/res.Health.json} apiSuccess
     */
    app.get('/health', (req, res) => {
        return res.json({
            healthy: true,
            message: 'I work all day, I work all night to get the open the data!'
        });
    });

    app.use('/api', schema.router);
    app.use('/docs', express.static('./doc'));
    app.use('/*', express.static('web/dist'));

    schema.router.use(bodyparser.urlencoded({ extended: true }));
    schema.router.use(morgan('combined'));
    schema.router.use(bodyparser.json({
        limit: '50mb'
    }));

    // Unified Auth
    schema.router.use(async (req, res, next) => {
        if (req.header('shared-secret')) {
            if (req.header('shared-secret') !== config.SharedSecret) {
                return res.status(401).json({
                    status: 401,
                    message: 'Invalid shared secret'
                });
            } else {
                req.auth = {
                    uid: false,
                    type: 'secret',
                    level: 'sponsor',
                    username: false,
                    access: 'admin',
                    email: false,
                    flags: {}
                };
            }
        } else if (req.header('authorization')) {
            const authorization = req.header('authorization').split(' ');
            if (authorization[0].toLowerCase() !== 'bearer') {
                return res.status(401).json({
                    status: 401,
                    message: 'Only "Bearer" authorization header is allowed'
                });
            }

            if (authorization[1].split('.')[0] === 'oa') {
                try {
                    req.auth = await token.validate(authorization[1]);
                    req.auth.type = 'token';
                } catch (err) {
                    return Err.respond(err, res);
                }
            } else {
                try {
                    const decoded = jwt.verify(authorization[1], config.SharedSecret);
                    req.auth = await user.user(decoded.u);
                    req.auth.type = 'session';
                } catch (err) {
                    return res.status(401).json({
                        status: 401,
                        message: err.message
                    });
                }
            }
        } else if (req.query.token) {
            try {
                const decoded = jwt.verify(req.query.token, config.SharedSecret);
                req.token = await user.user(decoded.u);
                req.token.type = 'token';
            } catch (err) {
                // Login/Verify uses non-jwt token
            }
        } else {
            req.auth = false;
        }

        return next();
    });


    await schema.api();
    // Load dynamic routes directory
    for (const r of fs.readdirSync(String(new URL('./routes/', import.meta.url)).replace('file://', ''))) {
        if (!config.silent) console.error(`ok - loaded routes/${r}`);
        await (await import('./routes/' + r)).default(schema, config);
    }

    schema.not_found();
    schema.error();

    return new Promise((resolve, reject) => {
        const srv = app.listen(4999, (err) => {
            if (err) return reject(err);

            if (!config.silent) console.log('ok - http://localhost:4999');
            return resolve([srv, config]);
        });
    });
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
