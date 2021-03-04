'use strict';

const fs = require('fs');
const session = require('express-session');
const { ValidationError } = require('express-json-validator-middleware');
const { Webhooks } = require('@octokit/webhooks');
const Busboy = require('busboy');
const Analytics = require('./lib/analytics');
const path = require('path');
const morgan = require('morgan');
const util = require('./lib/util');
const express = require('express');
const pkg = require('./package.json');
const minify = require('express-minify');
const bodyparser = require('body-parser');
const args = require('minimist')(process.argv, {
    boolean: ['help', 'populate', 'email'],
    string: ['postgres']
});

const pgSession = require('connect-pg-simple')(session);

const Param = util.Param;
const { Pool } = require('pg');

const Config = require('./lib/config');

if (require.main === module) {
    configure(args);
}

function configure(args, cb) {
    Config.env().then((config) => {
        return server(args, config, cb);
    }).catch((err) => {
        console.error(err);
        process.exit(1);
    });
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
    // these must be run after lib/config
    const Map = require('./lib/map');
    const ci = new (require('./lib/ci'))(config);
    const Err = require('./lib/error');
    const Run = require('./lib/run');
    const Job = require('./lib/job');
    const JobError = require('./lib/joberror');
    const Data = require('./lib/data');
    const Upload = require('./lib/upload');
    const Schedule = require('./lib/schedule');
    const Collection = require('./lib/collections');
    const schemas = new (require('./lib/schema'))();
    await schemas.build();

    let postgres = process.env.POSTGRES;

    if (args.postgres) {
        postgres = args.postgres;
    } else if (!postgres) {
        postgres = 'postgres://postgres@localhost:5432/openaddresses';
    }

    const pool = new Pool({
        connectionString: postgres
    });

    const analytics = new Analytics(pool);

    try {
        await pool.query(String(fs.readFileSync(path.resolve(__dirname, 'schema.sql'))));

        if (args.populate) {
            await Map.populate(pool);
        }
    } catch (err) {
        throw new Error(err);
    }

    const user = new (require('./lib/user'))(pool);
    const email = new (require('./lib/email'))();
    const token = new (require('./lib/token'))(pool);

    const app = express();
    const router = express.Router();

    app.disable('x-powered-by');
    app.use(minify());

    app.use(session({
        name: args.prod ? '__Host-session' : 'session',
        proxy: args.prod,
        resave: false,
        store: new pgSession({
            pool: pool,
            tableName : 'session'
        }),
        cookie: {
            maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days
            sameSite: true,
            secure: args.prod
        },
        saveUninitialized: true,
        secret: config.CookieSecret
    }));

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

    app.use('/api', router);
    app.use('/docs', express.static('./doc'));
    app.use('/*', express.static('web/dist'));

    router.use(bodyparser.urlencoded({ extended: true }));
    router.use(morgan('combined'));
    router.use(bodyparser.json({
        limit: '50mb'
    }));

    // Unified Auth
    router.use(async (req, res, next) => {
        if (req.session && req.session.auth && req.session.auth.username) {
            req.auth = req.session.auth;
            req.auth.type = 'session';
        } else if (req.header('shared-secret')) {
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

            try {
                req.auth = await token.validate(authorization[1]);
                req.auth.type = 'token';
            } catch (err) {
                return Err.respond(err, res);
            }
        } else {
            req.auth = false;
        }

        return next();
    });

    /**
     * @api {get} /api/schema List Schemas
     * @apiVersion 1.0.0
     * @apiName ListSchemas
     * @apiGroup Schemas
     * @apiPermission public
     *
     * @apiDescription
     *     List all JSON Schemas in use
     *     With no parameters this API will return a list of all the endpoints that have a form of schema validation
     *     If the url/method params are used, the schemas themselves are returned
     *
     *     Note: If url or method params are used, they must be used together
     *
     * @apiSchema (Query) {jsonschema=./schema/req.query.ListSchema.json} apiParam
     * @apiSchema {jsonschema=./schema/res.ListSchema.json} apiSuccess
     */
    router.get(
        ...schemas.get('GET /schema'),
        async (req, res) => {
            try {
                if (req.query.url && req.query.method) {
                    res.json(schemas.query(req.query.method, req.query.url));
                } else if (req.query.url || req.query.method) {
                    throw new Err(400, null, 'url & method params must be used together');
                } else {
                    return res.json(schemas.list());
                }
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {post} /api/upload Create Upload
     * @apiVersion 1.0.0
     * @apiName upload
     * @apiGroup Upload
     * @apiPermission upload
     *
     * @apiDescription
     *     Statically cache source data
     *
     *     If a source is unable to be pulled from directly, authenticated users can cache
     *     data resources to the OpenAddresses S3 cache to be pulled from
     */
    router.post(
        ...schemas.get('POST /upload'),
        async (req, res) => {
            try {
                await user.is_flag(req, 'upload');
            } catch (err) {
                return Err.respond(err, res);
            }

            const busboy = new Busboy({ headers: req.headers });

            const files = [];

            busboy.on('file', (fieldname, file, filename) => {
                files.push(Upload.put(req.auth.uid, filename, file));
            });

            busboy.on('finish', async () => {
                try {
                    res.json(await Promise.all(files));
                } catch (err) {
                    Err.respond(res, err);
                }
            });

            return req.pipe(busboy);
        }
    );

    /**
     * @api {get} /api/user List Users
     * @apiVersion 1.0.0
     * @apiName ListUsers
     * @apiGroup User
     * @apiPermission admin
     *
     * @apiDescription
     *     Return a list of users that have registered with the service
     *
     * @apiSchema (Query) {jsonschema=./schema/req.query.ListUsers.json} apiParam
     * @apiSchema {jsonschema=./schema/res.ListUsers.json} apiSuccess
     */
    router.get(
        ...schemas.get('GET /user'),
        async (req, res) => {
            try {
                await user.is_admin(req);

                res.json(await user.list(req.query));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {post} /api/user Create User
     * @apiVersion 1.0.0
     * @apiName CreateUser
     * @apiGroup User
     * @apiPermission public
     *
     * @apiDescription
     *     Create a new user
     *
     * @apiSchema (Body) {jsonschema=./schema/req.body.CreateUser.json} apiParam
     * @apiSchema {jsonschema=./schema/res.User.json} apiSuccess
     */
    router.post(
        ...schemas.get('POST /user'),
        async (req, res) => {
            try {
                const usr = await user.register(req.body);

                const forgot = await user.forgot(usr.username, 'verify');

                if (args.email) await email.verify({
                    username: usr.username,
                    email: usr.email,
                    token: forgot.token
                });

                res.json(usr);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {patch} /api/user/:id Update User
     * @apiVersion 1.0.0
     * @apiName PatchUser
     * @apiGroup User
     * @apiPermission admin
     *
     * @apiDescription
     *     Update information about a given user
     *
     * @apiParam {Number} :id The UID of the user to update
     *
     * @apiSchema (Body) {jsonschema=./schema/req.body.PatchUser.json} apiParam
     * @apiSchema {jsonschema=./schema/res.User.json} apiSuccess
     */
    router.patch(
        ...schemas.get('PATCH /user/:id'),
        async (req, res) => {
            try {
                await Param.int(req, 'id');

                await user.is_admin(req);

                res.json(await user.patch(req.params.id, req.body));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {post} /api/login/verify Verify User
     * @apiVersion 1.0.0
     * @apiName VerifyLogin
     * @apiGroup Login
     * @apiPermission public
     *
     * @apiDescription
     *     Email Verification of new user
     *
     * @apiSchema {jsonschema=./schema/res.Standard.json} apiSuccess
     */
    router.get(
        ...schemas.get('GET /login/verify'),
        async (req, res) => {
            try {
                res.json(await user.verify(req.query.token));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );


    /**
     * @api {get} /api/login Session Info
     * @apiVersion 1.0.0
     * @apiName GetLogin
     * @apiGroup Login
     * @apiPermission user
     *
     * @apiDescription
     *     Return information about the currently logged in user
     *
     * @apiSchema {jsonschema=./schema/res.Login.json} apiSuccess
     */
    router.get(
        ...schemas.get('GET /login'),
        async (req, res) => {
            if (req.session && req.session.auth && req.session.auth.username) {
                return res.json(await user.user(req.session.auth.uid));
            } else {
                return res.status(401).json({
                    status: 401,
                    message: 'Invalid session'
                });
            }
        }
    );

    /**
     * @api {post} /api/login Create Session
     * @apiVersion 1.0.0
     * @apiName CreateLogin
     * @apiGroup Login
     * @apiPermission user
     *
     * @apiDescription
     *     Log a user into the service and create an authenticated cookie
     *
     * @apiSchema (Body) {jsonschema=./schema/req.body.CreateLogin.json} apiParam
     * @apiSchema {jsonschema=./schema/res.Login.json} apiSuccess
     */
    router.post(
        ...schemas.get('POST /login'),
        async (req, res) => {
            try {
                req.session.auth = await user.login({
                    username: req.body.username,
                    password: req.body.password
                });

                return res.json({
                    uid: req.session.auth.uid,
                    level: req.session.auth.level,
                    username: req.session.auth.username,
                    email: req.session.auth.email,
                    access: req.session.auth.access,
                    flags: req.session.auth.flags
                });
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {delete} /api/login Delete Session
     * @apiVersion 1.0.0
     * @apiName DeleteLogin
     * @apiGroup Login
     * @apiPermission user
     *
     * @apiDescription
     *     Log a user out of the service
     *
     * @apiSchema {jsonschema=./schema/res.Standard.json} apiSuccess
     */
    router.delete(
        ...schemas.get('DELETE /login'),
        async (req, res) => {
            req.session.destroy((err) => {
                if (err) {
                    return res.status(500).json({
                        status: 500,
                        message: 'Failed to logout user'
                    });
                }

                return res.json({
                    status: 200,
                    message: 'The user has been logged ut'
                });
            });
        }
    );

    /**
     * @api {post} /api/login/forgot Forgot Login
     * @apiVersion 1.0.0
     * @apiName ForgotLogin
     * @apiGroup Login
     * @apiPermission public
     *
     * @apiDescription
     *     If a user has forgotten their password, send them a password reset link to their email
     *
     * @apiSchema (Body) {jsonschema=./schema/req.body.ForgotLogin.json} apiParam
     * @apiSchema {jsonschema=./schema/res.Standard.json} apiSuccess
     */
    router.post(
        ...schemas.get('POST /login/forgot'),
        async (req, res) => {
            try {
                const reset = await user.forgot(req.body.user); // Username or email

                if (args.email) await email.forgot(reset);

                // To avoid email scraping - this will always return true, regardless of success
                return res.json({ status: 200, message: 'Password Email Sent' });
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {post} /api/login/reset Reset Login
     * @apiVersion 1.0.0
     * @apiName ResetLogin
     * @apiGroup Login
     * @apiPermission public
     *
     * @apiDescription
     *     Once a user has obtained a password reset by email via the Forgot Login API,
     *     use the token to reset the password
     *
     * @apiSchema (Body) {jsonschema=./schema/req.body.ResetLogin.json} apiParam
     * @apiSchema {jsonschema=./schema/res.Standard.json} apiSuccess
     */
    router.post(
        ...schemas.get('POST /login/reset'),
        async (req, res) => {
            try {
                return res.json(await user.reset({
                    token: req.body.token,
                    password: req.body.password
                }));

            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/token List Tokens
     * @apiVersion 1.0.0
     * @apiName ListTokens
     * @apiGroup Token
     * @apiPermission user
     *
     * @apiDescription
     *     List all tokens associated with the requester's account
     *
     * @apiSchema {jsonschema=./schema/res.ListTokens.json} apiSuccess
     */
    router.get(
        ...schemas.get('GET /token'),
        async (req, res) => {
            try {
                await user.is_auth(req);

                return res.json(await token.list(req.auth));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {post} /api/token Create Token
     * @apiVersion 1.0.0
     * @apiName CreateToken
     * @apiGroup Token
     * @apiPermission user
     *
     * @apiDescription
     *     Create a new API token for programatic access
     *
     * @apiSchema (Body) {jsonschema=./schema/req.body.CreateToken.json} apiParam
     * @apiSchema {jsonschema=./schema/res.CreateToken.json} apiSuccess
     */
    router.post(
        ...schemas.get('POST /token'),
        async (req, res) => {
            try {
                await user.is_auth(req);

                return res.json(await token.generate(req.auth, req.body.name));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {delete} /api/token/:id Delete Token
     * @apiVersion 1.0.0
     * @apiName DeleteToken
     * @apiGroup Token
     * @apiPermission user
     *
     * @apiDescription
     *     Delete a user's API Token
     *
     * @apiSchema {jsonschema=./schema/res.Standard.json} apiSuccess
     */
    router.delete(
        ...schemas.get('DELETE /token/:id'),
        async (req, res) => {
            try {
                await Param.int(req, 'id');

                await user.is_auth(req);

                return res.json(await token.delete(req.auth, req.params.id));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {post} /api/schedule Scheduled Event
     * @apiVersion 1.0.0
     * @apiName Schedule
     * @apiGroup Schedule
     * @apiPermission admin
     *
     * @apiDescription
     *     Internal function to allow scheduled lambdas to kick off events
     *
     * @apiSchema (Body) {jsonschema=./schema/req.body.Schedule.json} apiParam
     * @apiSchema {jsonschema=./schema/res.Standard.json} apiSuccess
     */
    router.post(
        ...schemas.get('POST /schedule'),
        async (req, res) => {
            try {
                await user.is_admin(req);

                await Schedule.event(pool, req.body);

                return res.json({
                    status: 200,
                    message: 'Schedule Event Started'
                });
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/collections List Collections
     * @apiVersion 1.0.0
     * @apiName ListCollections
     * @apiGroup Collections
     * @apiPermission public
     *
     * @apiDescription
     *     Return a list of all collections and their glob rules
     *
     * @apiSchema {jsonschema=./schema/res.ListCollections.json} apiSuccess
     */
    router.get(
        ...schemas.get('GET /collections'),
        async (req, res) => {
            try {
                const collections = await Collection.list(pool);

                return res.json(collections);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/collections/:collection/data Get Collection Data
     * @apiVersion 1.0.0
     * @apiName DataCollection
     * @apiGroup Collections
     * @apiPermission user
     *
     * @apiDescription
     *   Download a given collection file
     *
     *    Note: the user must be authenticated to perform a download. One of our largest costs is
     *    S3 egress, authenticatd downloads allow us to prevent abuse and keep the project running and the data freetw
     *
     *    Faster Downloads? Have AWS? The Jobs, Data, & Collections API all return an `s3` property which links
     *    to a requester pays object on S3. For those that are able, this is the best way to download data.
     *
     *    OpenAddresses is entirely funded by volunteers (many of then the developers themselves!)
     *    Please consider donating if you are able https://opencollective.com/openaddresses
     *
     * @apiParam {Number} :collection Collection ID
     */
    router.get(
        ...schemas.get('GET /collections/:collection/data'),
        async (req, res) => {
            try {
                await Param.int(req, 'collection');

                await user.is_auth(req);

                Collection.data(pool, req.params.collection, res);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {delete} /api/collections/:collection Delete Collection
     * @apiVersion 1.0.0
     * @apiName DeleteCollection
     * @apiGroup Collections
     * @apiPermission admin
     *
     * @apiDescription
     *   Delete a collection (This should not be done lightly)
     *
     * @apiParam {Number} :collection Collection ID
     *
     * @apiSchema {jsonschema=./schema/res.Standard.json} apiSuccess
     */
    router.delete(
        ...schemas.get('DELETE /collections/:collection'),
        async (req, res) => {
            try {
                await Param.int(req, 'collection');

                await user.is_admin(req);

                await Collection.delete(pool, req.params.collection);

                return res.json({
                    status: 200,
                    message: 'Collection Deleted'
                });
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {post} /api/collections Create Collection
     * @apiVersion 1.0.0
     * @apiName CreateCollection
     * @apiGroup Collections
     * @apiPermission admin
     *
     * @apiDescription
     *   Create a new collection
     *
     * @apiSchema (Body) {jsonschema=./schema/req.body.CreateCollection.json} apiParam
     * @apiSchema {jsonschema=./schema/res.Collection.json} apiSuccess
     */
    router.post(
        ...schemas.get('POST /collections'),
        async (req, res) => {
            try {
                await user.is_admin(req);

                const collection = new Collection(req.body.name, req.body.sources);
                await collection.generate(pool);

                return res.json(collection.json());
            } catch (err) {
                console.error('ERROR');
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {patch} /api/collections/:collection Patch Collection
     * @apiVersion 1.0.0
     * @apiName PatchCollection
     * @apiGroup Collections
     * @apiPermission admin
     *
     * @apiDescription
     *   Update a collection
     *
     * @apiParam {Number} :collection Collection ID
     *
     * @apiSchema (Body) {jsonschema=./schema/req.body.PatchCollection.json} apiParam
     * @apiSchema {jsonschema=./schema/res.Collection.json} apiSuccess
     */
    router.patch(
        ...schemas.get('PATCH /collections/:collection'),
        async (req, res) => {
            try {
                await Param.int(req, 'collection');

                await user.is_admin(req);

                const collection = await Collection.from(pool, req.params.collection);

                collection.patch(req.body);

                await collection.commit(pool);

                return res.json(collection.json());
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/map Coverage TileJSON
     * @apiVersion 1.0.0
     * @apiName TileJSON
     * @apiGroup Map
     * @apiPermission public
     *
     * @apiDescription
     *   Data required for map initialization
     */
    router.get(
        ...schemas.get('GET /map'),
        (req, res) => {
            return res.json(Map.map());
        }
    );

    /**
     * @api {get} /api/map/:z/:x/:y.mvt Coverage MVT
     * @apiVersion 1.0.0
     * @apiName VectorTile
     * @apiGroup Map
     * @apiPermission public
     *
     * @apiDescription
     *   Retrive coverage Mapbox Vector Tiles
     *
     * @apiParam {Number} z Z coordinate
     * @apiParam {Number} x X coordinate
     * @apiParam {Number} y Y coordinate
     */
    router.get(
        ...schemas.get('GET /map/:z/:x/:y.mvt'),
        async (req, res) => {
            try {
                await Param.int(req, 'z');
                await Param.int(req, 'x');
                await Param.int(req, 'y');

                const tile = await Map.tile(pool, req.params.z, req.params.x, req.params.y);

                res.type('application/vnd.mapbox-vector-tile');
                return res.send(tile);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/data List Data
     * @apiVersion 1.0.0
     * @apiName ListData
     * @apiGroup Data
     * @apiPermission public
     *
     * @apiDescription
     *   Get the latest successful run of a given geographic area
     *
     * @apiSchema (Query) {jsonschema=./schema/req.query.ListData.json} apiParam
     * @apiSchema {jsonschema=./schema/res.ListData.json} apiSuccess
     */
    router.get(
        ...schemas.get('GET /data'),
        async (req, res) => {
            try {
                const data = await Data.list(pool, req.query);

                return res.json(data);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/data/:data Get Data
     * @apiVersion 1.0.0
     * @apiName SingleData
     * @apiGroup Data
     * @apiPermission public
     *
     * @apiDescription
     *   Return all information about a specific data segment
     *
     * @apiParam {Number} :data Data ID
     *
     * @apiSchema {jsonschema=./schema/res.Data.json} apiSuccess
     */
    router.get(
        ...schemas.get('GET /data/:data'),
        async (req, res) => {
            try {
                await Param.int(req, 'data');

                const data = await Data.from(pool, req.params.data);

                return res.json(data);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/data/:data/history Return Data History
     * @apiVersion 1.0.0
     * @apiName SingleHistoryData
     * @apiGroup Data
     * @apiPermission public
     *
     * @apiDescription
     *   Return the job history for a given data component
     *
     * @apiParam {Number} :data Data ID
     *
     * @apiSchema {jsonschema=./schema/res.DataHistory.json} apiSuccess
     */
    router.get(
        ...schemas.get('GET /data/:data/history'),
        async (req, res) => {
            try {
                const history = await Data.history(pool, req.params.data);

                return res.json(history);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/run List Runs
     * @apiVersion 1.0.0
     * @apiName ListRuns
     * @apiGroup Run
     * @apiPermission public
     *
     * @apiDescription
     *   Runs are container objects that contain jobs that were started at the same time or by the same process
     *
     * @apiParam {Number} :data Data ID
     *
     * @apiSchema (Query) {jsonschema=./schema/req.query.ListRuns.json} apiParam
     * @apiSchema {jsonschema=./schema/res.ListRuns.json} apiSuccess
     */
    router.get(
        ...schemas.get('GET /run'),
        async (req, res) => {
            try {
                if (req.query.status) req.query.status = req.query.status.split(',');
                const runs = await Run.list(pool, req.query);

                return res.json(runs);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {post} /api/run Create Run
     * @apiVersion 1.0.0
     * @apiName CreateRun
     * @apiGroup Run
     * @apiPermission admin
     *
     * @apiDescription
     *   Create a new run to hold a batch of jobs
     *
     * @apiSchema (Body) {jsonschema=./schema/req.body.CreateRun.json} apiParam
     * @apiSchema {jsonschema=./schema/res.Run.json} apiSuccess
     */
    router.post(
        ...schemas.get('POST /run'),
        async (req, res) => {
            try {
                await user.is_admin(req);

                const run = await Run.generate(pool, req.body);

                return res.json(run.json());
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/run/:run Get Run
     * @apiVersion 1.0.0
     * @apiName Single
     * @apiGroup Run
     * @apiPermission public
     *
     * @apiParam {Number} :run Run ID
     *
     * @apiSchema {jsonschema=./schema/res.Run.json} apiSuccess
     */
    router.get(
        ...schemas.get('GET /run/:run'),
        async (req, res) => {
            try {
                await Param.int(req, 'run');

                res.json(await Run.from(pool, req.params.run));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/run/:run/count Run Stats
     * @apiVersion 1.0.0
     * @apiName RunStats
     * @apiGroup Run
     * @apiPermission public
     *
     * @apiDescription
     *     Return statistics about jobs within a given run
     *
     * @apiParam {Number} :run Run ID
     *
     * @apiSchema {jsonschema=./schema/res.RunStats.json} apiSuccess
     */
    router.get(
        ...schemas.get('GET /run/:run/count'),
        async (req, res) => {
            try {
                await Param.int(req, 'run');

                res.json(await Run.stats(pool, req.params.run));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {patch} /api/run/:run Update Run
     * @apiVersion 1.0.0
     * @apiName Update
     * @apiGroup Run
     * @apiPermission public
     *
     * @apiDescription
     *   Update an existing run
     *
     * @apiParam {Number} :run Run ID
     *
     * @apiSchema (Body) {jsonschema=./schema/req.body.PatchRun.json} apiParam
     * @apiSchema {jsonschema=./schema/res.Run.json} apiSuccess
     *
     */
    router.patch(
        ...schemas.get('PATCH /run/:run'),
        async (req, res) => {
            try {
                await Param.int(req, 'run');

                await user.is_admin(req);

                const run = await Run.from(pool, req.params.run);

                run.patch(req.body);

                await run.commit(pool);

                return res.json(run.json());
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {post} /api/run/:run/jobs Populate Run Jobs
     * @apiVersion 1.0.0
     * @apiName SingleJobsCreate
     * @apiGroup Run
     * @apiPermission admin
     *
     * @apiDescription
     *     Given an array sources, explode it into multiple jobs and submit to batch
     *     or pass in a predefined list of sources/layer/names
     *
     *     Note: once jobs are attached to a run, the run is "closed" and subsequent
     *     jobs cannot be attached to it
     *
     * @apiParam {Number} :run Run ID
     *
     * @apiSchema (Body) {jsonschema=./schema/req.body.SingleJobsCreate.json} apiParam
     * @apiSchema {jsonschema=./schema/res.SingleJobsCreate.json} apiSuccess
     */
    router.post(
        ...schemas.get('POST /run/:run/jobs'),
        async (req, res) => {
            try {
                await Param.int(req, 'run');

                await user.is_admin(req);

                const jobs = await Run.populate(pool, req.params.run, req.body.jobs);

                return res.json(jobs);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/run/:run/jobs List Run Jobs
     * @apiVersion 1.0.0
     * @apiName SingleJobs
     * @apiGroup Run
     * @apiPermission public
     *
     * @apiDescription
     *     Return all jobs for a given run
     *
     * @apiParam {Number} :run Run ID
     *
     * @apiSchema {jsonschema=./schema/res.SingleJobs.json} apiSuccess
     */
    router.get(
        ...schemas.get('GET /run/:run/jobs'),
        async (req, res) => {
            try {
                await Param.int(req, 'run');

                const jobs = await Run.jobs(pool, req.params.run);

                res.json({
                    run: req.params.run,
                    jobs: jobs
                });
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/job List Jobs
     * @apiVersion 1.0.0
     * @apiName ListJobs
     * @apiGroup Job
     * @apiPermission public
     *
     * @apiDescription
     *     Return information about a given subset of jobs
     *
     * @apiSchema (query) {jsonschema=./schema/req.query.ListJobs.json} apiParam
     * @apiSchema {jsonschema=./schema/res.ListJobs.json} apiSuccess
     */
    router.get(
        ...schemas.get('GET /job'),
        async (req, res) => {
            try {
                if (req.query.status) req.query.status = req.query.status.split(',');
                return res.json(await Job.list(pool, req.query));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/job/error Get Job Errors
     * @apiVersion 1.0.0
     * @apiName ErrorList
     * @apiGroup JobErrors
     * @apiPermission public
     *
     * @apiDescription
     *     All jobs that fail as part of a live run are entered into the JobError API
     *     This API powers a page that allows for human review of failing jobs
     *     Note: Job Errors are cleared with every subsequent full cache
     *
     * @apiSchema {jsonschema=./schema/res.ErrorList.json} apiSuccess
     */
    router.get(
        ...schemas.get('GET /job/error'),
        async (req, res) => {
            try {
                return res.json(await JobError.list(pool, req.query));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/job/error/count Job Error Count

     * @apiVersion 1.0.0
     * @apiName ErrorCount
     * @apiGroup JobError
     * @apiPermission public
     *
     * @apiDescription
     *     Return a simple count of the current number of job errors
     *
     * @apiSchema {jsonschema=./schema/res.ErrorCount.json} apiSuccess
     */
    router.get(
        ...schemas.get('GET /job/error/count'),
        async (req, res) => {
            try {
                return res.json(await JobError.count(pool));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );


    /**
     * @api {get} /api/job/error/:job Get Job Error
     * @apiVersion 1.0.0
     * @apiName ErrorList
     * @apiGroup ErrorSingle
     * @apiPermission public
     *
     * @apiDescription
     *   Return a single job error if one exists or 404 if not
     *
     * @apiSchema {jsonschema=./schema/res.ErrorSingle.json} apiSuccess
     */
    router.get(
        ...schemas.get('GET /job/error/:job'),
        async (req, res) => {
            try {
                await Param.int(req, 'job');

                return res.json(await JobError.get(pool, req.params.job));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {post} /api/job/error Create Job Error
     * @apiVersion 1.0.0
     * @apiName ErrorCreate
     * @apiGroup JobError
     * @apiPermission admin
     *
     * @apiDescription
     *     Create a new Job Error in response to a live job that Failed or Warned
     *
     * @apiParam {Number} job Job ID of the given error
     * @apiParam {String} message Text representation of the error
     *
     * @apiSchema {jsonschema=./schema/res.ErrorCreate.json} apiSuccess
     */
    router.post(
        ...schemas.get('POST /job/error'),
        async (req, res) => {
            try {
                await user.is_admin(req);

                const joberror = new JobError(req.body.job, req.body.message);
                return res.json(await joberror.generate(pool));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {post} /api/job/error/:job Resolve Job Error
     * @apiVersion 1.0.0
     * @apiName ErrorModerate
     * @apiGroup JobError
     * @apiPermission admin
     *
     * @apiDescription
     *     Mark a job error as resolved
     *
     * @apiParam {Number} :job Job ID
     *
     * @apiSchema (Body) {jsonschema=./schema/res.ErrorModerate.json} apiParam
     * @apiSchema {jsonschema=./schema/res.ErrorModerate.json} apiSuccess
     */
    router.post(
        ...schemas.get('POST /job/error/:job'),
        async (req, res) => {
            try {
                await Param.int(req, 'job');

                await user.is_flag(req, 'moderator');

                res.json(JobError.moderate(pool, ci, req.params.job, req.body));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/job/:job Get Job
     * @apiVersion 1.0.0
     * @apiName Single
     * @apiGroup Job
     * @apiPermission public
     *
     * @apiDescription
     *     Return all information about a given job
     *
     * @apiParam {Number} :job Job ID
     *
     * @apiSchema {jsonschema=./schema/res.Job.json} apiSuccess
     */
    router.get(
        ...schemas.get('GET /job/:job'),
        async (req, res) => {
            try {
                await Param.int(req, 'job');

                const job = await Job.from(pool, req.params.job);

                return res.json(job.json());
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {post} /api/job/:job Rerun Job
     * @apiVersion 1.0.0
     * @apiName JobRerun
     * @apiGroup Job
     * @apiPermission admin
     *
     * @apiDescription
     *     Submit a job for reprocessing - often useful for network errors
     *
     * @apiParam {Number} :job Job ID
     */
    router.post(
        ...schemas.get('POST /job/:job/rerun'),
        async (req, res) => {
            try {
                await Param.int(req, 'job');

                await user.is_admin(req);

                const job = await Job.from(pool, req.params.job);
                const run = await Run.from(pool, job.run);

                const new_run = await Run.generate(pool, {
                    live: !!run.live
                });

                return res.json(await Run.populate(pool, new_run.id, [{
                    source: job.source,
                    layer: job.layer,
                    name: job.name
                }]));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/job/:job/delta Job Stats Comparison
     * @apiVersion 1.0.0
     * @apiName SingleDelta
     * @apiGroup Job
     * @apiPermission public
     *
     * @apiDescription
     *   Compare the stats of the given job against the current live data job
     *
     * @apiParam {Number} :job Job ID
     *
     * @apiSchema {jsonschema=./schema/res.SingleDelta.json} apiSuccess
     */
    router.get(
        ...schemas.get('GET /job/:job/delta'),
        async (req, res) => {
            try {
                await Param.int(req, 'job');

                const delta = await Job.delta(pool, req.params.job);

                return res.json(delta);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/job/:job/output/source.png Get Job Preview
     * @apiVersion 1.0.0
     * @apiName SingleOutputPreview
     * @apiGroup Job
     * @apiPermission public
     *
     * @apiDescription
     *   Return the preview image for a given job
     *
     * @apiParam {Number} :job Job ID
     */
    router.get(
        ...schemas.get('GET /job/:job/output/source.png'),
        async (req, res) => {
            try {
                await Param.int(req, 'job');
                Job.preview(req.params.job, res);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/job/:job/output/source.geojson.gz Get Job Data
     * @apiVersion 1.0.0
     * @apiName SingleOutputData
     * @apiGroup Job
     * @apiPermission public
     *
     * @apiDescription
     *    Note: the user must be authenticated to perform a download. One of our largest costs is
     *    S3 egress, authenticatd downloads allow us to prevent abuse and keep the project running and the data freetw
     *
     *    Faster Downloads? Have AWS? The Jobs, Data, & Collections API all return an `s3` property which links
     *    to a requester pays object on S3. For those that are able, this is the best way to download data.
     *
     *    OpenAddresses is entirely funded by volunteers (many of then the developers themselves!)
     *    Please consider donating if you are able https://opencollective.com/openaddresses
     *
     * @apiParam {Number} :job Job ID
     */
    router.get(
        ...schemas.get('GET /job/:job/output/source.geojson.gz'),
        async (req, res) => {
            try {
                await Param.int(req, 'job');

                await user.is_auth(req);

                await Job.data(pool, req.params.job, res);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/job/:job/output/sample Small Sample
     * @apiVersion 1.0.0
     * @apiName SampleData
     * @apiGroup Job
     * @apiPermission public
     *
     * @apiDescription
     *   Return an Array containing a sample of the properties
     *
     * @apiParam {Number} :job Job ID
     */
    router.get(
        ...schemas.get('GET /job/:job/output/sample'),
        async (req, res) => {
            try {
                await Param.int(req, 'job');

                return res.json(await Job.sample(pool, req.params.job));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/job/:job/output/cache.zip Get Job Cache
     * @apiVersion 1.0.0
     * @apiName SingleOutputCache
     * @apiGroup Job
     * @apiPermission public
     *
     *  @apiDescription
     *    Note: the user must be authenticated to perform a download. One of our largest costs is
     *    S3 egress, authenticatd downloads allow us to prevent abuse and keep the project running and the data freetw
     *
     *    Faster Downloads? Have AWS? The Jobs, Data, & Collections API all return an `s3` property which links
     *    to a requester pays object on S3. For those that are able, this is the best way to download data.
     *
     *    OpenAddresses is entirely funded by volunteers (many of then the developers themselves!)
     *    Please consider donating if you are able https://opencollective.com/openaddresses
     *
     * @apiParam {Number} :job Job ID
     *
     */
    router.get(
        ...schemas.get('GET /job/:job/output/cache.zip'),
        async (req, res) => {
            try {
                await Param.int(req, 'job');

                await user.is_auth(req);

                Job.cache(req.params.job, res);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/job/:job/log Get Job Log
     * @apiVersion 1.0.0
     * @apiName SingleLog
     * @apiGroup Job
     * @apiPermission public
     *
     * @apiDescription
     *   Return the batch-machine processing log for a given job
     *   Note: These are stored in AWS CloudWatch and *do* expire
     *   The presence of a loglink on a job, does not guarentree log retention
     *
     * @apiParam {Number} :job Job ID
     *
     * @apiSchema {jsonschema=./schema/res.SingleLog.json} apiSuccess
     */
    router.get(
        ...schemas.get('GET /job/:job/log'),
        async (req, res) => {
            try {
                await Param.int(req, 'job');

                const job = await Job.from(pool, req.params.job);

                return res.json(await job.log());
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {patch} /api/job/:job Update Job
     * @apiVersion 1.0.0
     * @apiName JobPatch
     * @apiGroup Job
     * @apiPermission admin
     *
     * @apiDescription
     *   Update a job
     *
     * @apiParam {Number} :job Job ID
     *
     * @apiSchema (Body) {jsonschema=./schema/req.body.PatchJob.json} apiParam
     * @apiSchema {jsonschema=./schema/res.Job.json} apiSuccess
     */
    router.patch(
        ...schemas.get('PATCH /job/:job'),
        async (req, res) => {
            try {
                await Param.int(req, 'job');

                await user.is_admin(req);

                const job = await Job.from(pool, req.params.job);

                job.patch(req.body);

                await job.commit(pool, Run, Data, ci);

                await Run.ping(pool, ci, job);

                return res.json(job.json());
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/dash/traffic Session Counts
     * @apiVersion 1.0.0
     * @apiName TrafficAnalytics
     * @apiGroup Analytics
     * @apiPermission admin
     *
     * @apiDescription
     *   Report anonymouns traffic data about the number of user session created in a given day.
     *
     * @apiSchema {jsonschema=./schema/res.TrafficAnalytics.json} apiSuccess
     */
    router.get(
        ...schemas.get('GET /dash/traffic'),
        async (req, res) => {
            try {
                await user.is_admin(req);

                res.json(await analytics.traffic());
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/dash/collections Collection Counts
     * @apiVersion 1.0.0
     * @apiName CollectionsAnalytics
     * @apiGroup Analytics
     * @apiPermission admin
     *
     * @apiDescription
     *   Report anonymouns traffic data about the number of collection downloads
     *
     * @apiSchema {jsonschema=./schema/res.CollectionsAnalytics.json} apiSuccess
     */
    router.get(
        ...schemas.get('GET /dash/collections'),
        async (req, res) => {
            try {
                await user.is_admin(req);

                res.json(await analytics.collections());
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );


    /**
     * @api {post} /api/github/event Github Webhook
     * @apiVersion 1.0.0
     * @apiName Github
     * @apiGroup Webhooks
     * @apiPermission admin
     *
     * @apiDescription
     *   Callback endpoint for GitHub Webhooks. Should not be called by user functions
     */
    router.post(
        ...schemas.get('POST /github/event'),
        async (req, res) => {
            if (!process.env.GithubSecret) return res.status(400).send('Invalid X-Hub-Signature');

            const ghverify = new Webhooks({
                secret: process.env.GithubSecret
            });

            if (!ghverify.verify(req.body, req.headers['x-hub-signature'])) {
                res.status(400).send('Invalid X-Hub-Signature');
            }

            try {
                if (req.headers['x-github-event'] === 'push') {
                    await ci.push(pool, req.body);

                    res.json(true);
                } else if (req.headers['x-github-event'] === 'pull_request') {
                    await ci.pull(pool, req.body);

                    res.json(true);
                } else if (req.headers['x-github-event'] === 'issue_comment') {
                    await ci.issue(pool, req.body);

                    res.json(true);
                } else {
                    res.status(200).send('Accepted but ignored');
                }
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {post} /api/opencollective/event OpenCollective
     * @apiVersion 1.0.0
     * @apiName OpenCollective
     * @apiGroup Webhooks
     * @apiPermission admin
     *
     * @apiDescription
     *   Callback endpoint for GitHub Webhooks. Should not be called by user functions
     */
    router.post(
        ...schemas.get('POST /opencollective/event'),
        async (req, res) => {
            try {
                console.error(req.headers);
                console.error(req.body);

                res.status(200).send('Accepted but ignored');
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    router.use((err, req, res, next) => {
        if (err instanceof ValidationError) {
            let errs = [];

            if (err.validationErrors.body) {
                errs = errs.concat(err.validationErrors.body.map((e) => {
                    return { message: e.message };
                }));
            }

            if (err.validationErrors.query) {
                errs = errs.concat(err.validationErrors.query.map((e) => {
                    return { message: e.message };
                }));
            }

            return Err.respond(
                new Err(400, null, 'validation error'),
                res,
                errs
            );
        } else {
            next(err);
        }
    });

    router.all('*', (req, res) => {
        return res.status(404).json({
            status: 404,
            message: 'API endpoint does not exist!'
        });
    });

    const srv = app.listen(4999, (err) => {
        if (err) return err;

        if (cb) return cb(srv, pool);

        console.log('ok - http://localhost:4999');
    });
}

module.exports = configure;
