import fs from 'fs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import Cacher from './lib/cacher.js';
import express from 'express';
import minify from 'express-minify';
import Schema from '@openaddresses/batch-schema';
import Err from '@openaddresses/batch-error';
import { Pool } from '@openaddresses/batch-generic';
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

async function configure(args) {
    try {
        return server(await Config.env(args));
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

export default async function server(config) {
    const TileBase = (await import('tilebase')).default;

    if (!config.args['no-tilebase']) {
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

    config.cacher = new Cacher(config.args['no-cache'], config.silent);
    config.pool = await Pool.connect(process.env.POSTGRES || config.args.postgres || 'postgres://postgres@localhost:5432/openaddresses');

    try {
        if (config.args.populate) {
            await Map.populate(config.pool);
        }
    } catch (err) {
        throw new Error(err);
    }

    const user = new User(config.pool);
    const token = new Token(config.pool);

    const app = express();

    const schema = new Schema(express.Router(), {
        schemas: new URL('./schema', import.meta.url)
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

    app.use('/api', schema.router);
    app.use('/docs', express.static('./doc'));
    app.use('/*', express.static('web/dist'));

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
    await schema.load(
        new URL('./routes/', import.meta.url),
        config,
        {
            silent: !!config.silent
        }
    );

    schema.not_found();
    schema.error();

    fs.writeFileSync(new URL('./doc/api.js', import.meta.url), schema.docs.join('\n'));

    return new Promise((resolve, reject) => {
        const srv = app.listen(4999, (err) => {
            if (err) return reject(err);

            if (!config.silent) console.log('ok - http://localhost:4999');
            return resolve([srv, config]);
        });
    });
}
