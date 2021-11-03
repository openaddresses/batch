const fs = require('fs');
const jwt = require('jsonwebtoken');
const Cacher = require('./lib/cacher');
const Analytics = require('./lib/analytics');
const path = require('path');
const morgan = require('morgan');
const express = require('express');
const pkg = require('./package.json');
const minify = require('express-minify');
const bodyparser = require('body-parser');
const TileBase = require('tilebase');
const { Schema, Err } = require('@openaddresses/batch-schema');
const { sql, createPool } = require('slonik');
const args = require('minimist')(process.argv, {
    boolean: ['help', 'populate', 'email', 'no-cache', 'no-tilebase'],
    alias: {
        no_tb: 'no-tilebase',
        no_c: 'no-cache'
    },
    string: ['postgres']
});

const Config = require('./lib/config');
const SiteMap = require('./lib/sitemap');

if (require.main === module) {
    configure(args);
}

async function configure(args, cb) {
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

async function server(args, config, cb) {
    let tb = false;
    if (!args['no-tilebase']) {
        console.log(`ok - loading: s3://${config.Bucket}/${config.StackName}/fabric.tilebase`);
        tb = new TileBase(`s3://${config.Bucket}/${config.StackName}/fabric.tilebase`);
        console.log('ok - loaded TileBase');
        await tb.open();
    } else {
        console.log('ok - TileBase Disabled');
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
            pool = createPool(postgres);

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

    const analytics = new Analytics(pool);

    config.cacher = new Cacher(args['no-cache']);
    config.pool = pool;
    config.tb = tb;

    try {
        if (args.populate) {
            await Map.populate(pool);
        }
    } catch (err) {
        throw new Error(err);
    }

    const user = new (require('./lib/user'))(pool);
    const token = new (require('./lib/token'))(pool);

    const app = express();

    const schema = new Schema(express.Router(), {
        schemas: path.resolve(__dirname, './schema')
    });

    app.disable('x-powered-by');
    app.use(minify());

    app.use(analytics.middleware());
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

            const list = await config.cacher.get(Miss(req.query, 'sitemap'), async () => {
                return await SiteMap.list(config.pool);
            });

            res.send(list);
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
    for (const r of fs.readdirSync(path.resolve(__dirname, './routes'))) {
        if (!config.silent) console.error(`ok - loaded routes/${r}`);
        await require('./routes/' + r)(schema, config);
    }

    schema.router.all('*', (req, res) => {
        return res.status(404).json({
            status: 404,
            message: 'API endpoint does not exist!'
        });
    });

    schema.error();

    const srv = app.listen(4999, (err) => {
        if (err) return err;

        if (cb) return cb(srv, config);

        console.log('ok - http://localhost:4999');
    });
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

module.exports = configure;
