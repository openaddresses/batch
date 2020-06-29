'use strict';

const fs = require('fs');
const session = require('express-session');
const WebhooksApi = require('@octokit/webhooks');
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
    boolean: ['help', 'populate'],
    string: ['postgres']
});

const pgSession = require('connect-pg-simple')(session);

const Param = util.Param;
const router = express.Router();
const app = express();
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

    const auth = new (require('./lib/auth').Auth)(pool);
    const authtoken = new (require('./lib/auth').AuthToken)(pool);

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
     * @api {get} /api Get API metadata
     * @apiVersion 1.0.0
     * @apiName Meta
     * @apiGroup Server
     * @apiPermission public
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "version": "1.0.0"
     *   }
     */
    app.get('/api', (req, res) => {
        return res.json({
            version: pkg.version
        });
    });

    /**
     * @api {get} /health Healthcheck endpoint for AWS ELB
     * @apiVersion 1.0.0
     * @apiName Health
     * @apiGroup Server
     * @apiPermission public
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "healthy": true,
     *       "message": "I work all day, I work all night to get the open the data!"
     *   }
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
    router.use(bodyparser.json());

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
                req.auth = await authtoken.validate(authorization[1]);
            } catch (err) {
                return Err.respond(err, res);
            }
        } else {
            req.auth = false;
        }

        return next();
    });

    /**
     * @api {post} /api/upload Allow a user to upload a manually maintained data source
     * @apiVersion 1.0.0
     * @apiName upload
     * @apiGroup Upload
     * @apiPermission upload
     */
    router.post('/upload', async (req, res) => {
        try {
            await auth.is_flag(req, 'upload');
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
    });

    /**
     * @api {get} /api/user Return a list of all active users
     * @apiVersion 1.0.0
     * @apiName list
     * @apiGroup User
     * @apiPermission admin
     */
    router.get('/user', async (req, res) => {
        try {
            await auth.is_admin(req);

            const users = await auth.list();

            return res.json(users);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/health Create a new user
     * @apiVersion 1.0.0
     * @apiName Create
     * @apiGroup User
     * @apiPermission public
     */
    router.post('/user', async (req, res) => {
        try {
            await auth.register(req.body);

            return res.json({
                status: 200,
                message: 'User Created'
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/user/me If the user has an active session, return metadata about the user
     * @apiVersion 1.0.0
     * @apiName self
     * @apiGroup User
     * @apiPermission user
     */
    router.get('/user/me', async (req, res) => {
        if (req.session && req.session.auth && req.session.auth.uid) {
            return res.json(await auth.user(req.session.auth.uid));
        } else {
            return res.status(401).json({
                status: 401,
                message: 'Invalid session'
            });
        }
    });

    /**
     * @api {patch} /api/user/:id Update a user with the given body
     * @apiVersion 1.0.0
     * @apiName self
     * @apiGroup User
     * @apiPermission admin
     *
     * @apiParam {Number} id The UID of the user to update
     */
    router.patch('/user/:id', async (req, res) => {
        Param.int(req, res, 'id');

        try {
            await auth.is_admin(req);

            res.json(await auth.patch(req.params.id, req.body));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/login If the user has an active session, reauthenticate the frontend
     * @apiVersion 1.0.0
     * @apiName get
     * @apiGroup Login
     * @apiPermission user
     */
    router.get('/login', async (req, res) => {
        if (req.session && req.session.auth && req.session.auth.username) {
            return res.json({
                username: req.session.auth.username,
                email: req.session.auth.email,
                access: req.session.auth.access,
                flags: req.session.auth.flags
            });
        } else {
            return res.status(401).json({
                status: 401,
                message: 'Invalid session'
            });
        }
    });

    /**
     * @api {post} /api/login Get auth cookies for a given session
     * @apiVersion 1.0.0
     * @apiName login
     * @apiGroup Login
     * @apiPermission user
     */
    router.post('/login', async (req, res) => {
        try {
            const user = await auth.login({
                username: req.body.username,
                password: req.body.password
            });

            req.session.auth = user;

            return res.json({
                username: user.username
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * {get} /api/token List API Tokens for the authenticated user
     * @apiVersion 1.0.0
     * @apiName ListTokens
     * @apiGroup Token
     * @apiPermission user
     */
    router.get('/token', async (req, res) => {
        try {
            await auth.is_auth(req);

            return res.json(await authtoken.list(req.auth));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * {post} /api/token Create an API token for the authenticated user
     * @apiVersion 1.0.0
     * @apiName CreateToken
     * @apiGroup Token
     * @apiPermission user
     */
    router.post('/token', async (req, res) => {
        try {
            await auth.is_auth(req);

            return res.json(await authtoken.generate(req.auth, req.body.name));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * {delete} /api/token/:id Delete an API token that is owned by the authenticated user
     * @apiVersion 1.0.0
     * @apiName DeleteToken
     * @apiGroup Token
     * @apiPermission user
     */
    router.delete('/token/:id', async (req, res) => {
        Param.int(req, res, 'id');

        try {
            await auth.is_auth(req);

            return res.json(await authtoken.delete(req.auth, req.params.id));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/schedule Kick off the scheduled full rebuild
     * @apiVersion 1.0.0
     * @apiName Schedule
     * @apiGroup Schedule
     * @apiPermission admin
     *
     * @apiParam {Number} Type of lambda scheduled event to respond to. One of "sources" or "collect"
     */
    router.post('/schedule', async (req, res) => {
        try {
            await auth.is_admin(req);

            await Schedule.event(pool, req.body);

            return res.json(true);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/collections List data collections
     * @apiVersion 1.0.0
     * @apiName List
     * @apiGroup Collections
     * @apiPermission public
     */
    router.get('/collections', async (req, res) => {
        try {
            const collections = await Collection.list(pool);

            return res.json(collections);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/collections/:collection/data Get data for a given collection
     * @apiVersion 1.0.0
     * @apiName Data
     * @apiGroup Collections
     * @apiPermission public
     */
    router.get('/collections/:collection/data', async (req, res) => {
        Param.int(req, res, 'collection');
        try {
            Collection.data(pool, req.params.collection, res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {delete} /api/collections/:collection Delete Collection
     * @apiVersion 1.0.0
     * @apiName Delete
     * @apiGroup Collections
     * @apiPermission admin
     */
    router.delete('/collections/:collection', async (req, res) => {
        Param.int(req, res, 'collection');

        try {
            await auth.is_admin(req);

            await Collection.delete(pool, req.params.collection);

            return res.json(true);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/collections Create Collection
     * @apiVersion 1.0.0
     * @apiName Create
     * @apiGroup Collections
     * @apiPermission admin
     */
    router.post('/collections', async (req, res) => {
        try {
            await auth.is_admin(req);

            const collection = new Collection(req.body.name, req.body.sources);
            await collection.generate(pool);

            return res.json(collection.json());
        } catch (err) {
            console.error('ERROR');
            return Err.respond(err, res);
        }
    });

    /**
     * @api {patch} /api/collections/:collection Update Collection
     * @apiVersion 1.0.0
     * @apiName Update
     * @apiGroup Collections
     * @apiPermission admin
     */
    router.patch('/collections/:collection', async (req, res) => {
        Param.int(req, res, 'collection');

        try {
            await auth.is_admin(req);

            const collection = await Collection.from(pool, req.params.collection);

            collection.patch(req.body);

            await collection.commit(pool);

            return res.json(collection.json());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/map Return a TileJSON document for data coverage layers
     * @apiVersion 1.0.0
     * @apiName TileJSON
     * @apiGroup Map
     * @apiPermission public
     */
    router.get('/map', (req, res) => {
        return res.json(Map.map());
    });

    /**
     * @api {get} /api/map/:z/:x/:y.mvt Return a given Mapbox Vector Tile
     * @apiVersion 1.0.0
     * @apiName VectorTile
     * @apiGroup Map
     * @apiPermission public
     *
     * @apiParam {Number} z Z coordinate
     * @apiParam {Number} x X coordinate
     * @apiParam {Number} y Y coordinate
     */
    router.get('/map/:z/:x/:y.mvt', async (req, res) => {
        Param.int(req, res, 'z');
        Param.int(req, res, 'x');
        Param.int(req, res, 'y');

        try {
            const tile = await Map.tile(pool, req.params.z, req.params.x, req.params.y);

            res.type('application/vnd.mapbox-vector-tile');
            return res.send(tile);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/data Search for processed data
     * @apiVersion 1.0.0
     * @apiName List
     * @apiGroup Data
     * @apiPermission public
     *
     * @apiParam {String} [source] Filter results by source name
     * @apiParamExample {String} ?source
     *     ?source="us/ca"
     *
     * @apiParam {String} [layer] Filter results by layer type
     * @apiParamExample {String} ?layer
     *     ?layer="addresses"
     *
     * @apiParam {String} [name] Filter results by layer name
     * @apiParamExample {String} ?name
     *     ?name="city"
     *
     * @apiParam {String} [point] Filter results by geographic point
     * @apiParamExample {String} ?point
     *     ?point="<lng>,<lat>"
     */
    router.get('/data', async (req, res) => {
        try {
            const data = await Data.list(pool, req.query);

            return res.json(data);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/data/:data Get data by data ID
     * @apiVersion 1.0.0
     * @apiName Single
     * @apiGroup Data
     * @apiPermission public
     *
     * @apiParam {Number} data Data ID
     */
    router.get('/data/:data', async (req, res) => {
        try {
            const data = await Data.from(pool, req.params.data);

            return res.json(data);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/data/:data/history Return full job history for a given data ID
     * @apiVersion 1.0.0
     * @apiName SingleHistory
     * @apiGroup Data
     * @apiPermission public
     *
     * @apiParam {Number} data Data ID
     */
    router.get('/data/:data/history', async (req, res) => {
        try {
            const history = await Data.history(pool, req.params.data);

            return res.json(history);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/run Search for data runs
     * @apiVersion 1.0.0
     * @apiName List
     * @apiGroup Run
     * @apiPermission public
     *
     * @apiParam {Number} [limit=100] Limit number of returned runs
     * @apiParamExample {String} ?limit
     *     ?limit=12
     *
     * @apiParam {Number} [run] Only show run associated with a given ID
     * @apiParamExample {String} ?run
     *     ?run=12
     */
    router.get('/run', async (req, res) => {
        try {
            const runs = await Run.list(pool);

            return res.json(runs);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/run Create a Run
     * @apiVersion 1.0.0
     * @apiName Create
     * @apiGroup Run
     * @apiPermission admin
     *
     * @apiParam {Boolean} live If the job succeeds, should it replace the current data entry
     *
     * @apiParam {Object} github If not live, information about the GitHub CI reference
     * @apiParam {String} github.ref Git reference (branch) of the given run
     * @apiParam {String} github.sha Git SHA of the given run
     * @apiParam {String} github.url Github URL to the specific commit
     * @apiParam {Number} github.check Github check ID to update
     *
     */
    router.post('/run', async (req, res) => {
        try {
            await auth.is_admin(req);

            const run = await Run.generate(pool, req.body);

            return res.json(run.json());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/run/:run Get a specific run
     * @apiVersion 1.0.0
     * @apiName Single
     * @apiGroup Run
     * @apiPermission public
     *
     * @apiParam {Number} run Run ID
     */
    router.get('/run/:run', async (req, res) => {
        Param.int(req, res, 'run');

        try {
            const run = await Run.from(pool, req.params.run);

            return res.json(run.json());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {patch} /api/run/:run Update a specific run
     * @apiVersion 1.0.0
     * @apiName Single
     * @apiGroup Run
     * @apiPermission public
     *
     * @apiParam {Number} run Run ID
     */
    router.patch('/run/:run', async (req, res) => {
        Param.int(req, res, 'run');

        try {
            await auth.is_admin(req);

            const run = await Run.from(pool, req.params.run);

            run.patch(req.body);

            await run.commit(pool);

            return res.json(run.json());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/run/:run/jobs Populate a created run with jobs
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
     * @apiParam {Number} run Run ID
     * @apiParam {json} jobs Jobs to attach to run
     * @apiParamExample {json} jobs
     *     ['https://github.com/path_to_source', {
     *         "source": "https://github/path_to_source",
     *         "layer": "addresses",
     *         "name": "dcgis"
     *     }]
     */
    router.post('/run/:run/jobs', async (req, res) => {
        Param.int(req, res, 'run');

        if (!Array.isArray(req.body.jobs)) {
            return res.status(400).send({
                status: 400,
                error: 'jobs body must be array'
            });
        }

        try {
            await auth.is_admin(req);

            const jobs = await Run.populate(pool, req.params.run, req.body.jobs);

            return res.json(jobs);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/run/:run/jobs Get jobs for a given run ID
     * @apiVersion 1.0.0
     * @apiName SingleJobs
     * @apiGroup Run
     * @apiPermission public
     *
     * @apiParam {Number} run Run ID
     */
    router.get('run/:run/jobs', async (req, res) => {
        Param.int(req, res, 'run');

        try {
            const jobs = await Run.jobs(pool, req.params.run);

            res.json({
                run: req.params.run,
                jobs: jobs
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });



    /**
     * @api {get} /api/job Search for job runs
     * @apiVersion 1.0.0
     * @apiName List
     * @apiGroup Job
     * @apiPermission public
     *
     * @apiParam {Number} [limit=100] Limit number of returned jobs
     * @apiParamExample {String} ?limit
     *     ?limit=12
     *
     * @apiParam {Number} [run] Only show job associated with a given ID
     * @apiParamExample {String} ?run
     *     ?run=12
     *
     * @apiParam {String} [status="Success,Fail,Pending,Warn"] Only show job with one of the given statuses
     * @apiParamExample {String} ?status
     *     ?status=Warn
     *     ?status=Warn,Pending
     *     ?status=Success,Fail,Pending,Warn
     *
     * @apiParam {String} [live="All"] Only show jobs associated with a live run
     * @apiParamExample {String} ?env
     *     ?env=true
     *     ?env=false
     *
     * @apiParam {String} [before=] Only show jobs before the given date
     * @apiParamExample {String} ?before
     *     ?before=2020-01-01
     *     ?before=2020-12-01
     *
     * @apiParam {String} [after=] Only show jobs after the given date
     * @apiParamExample {String} ?after
     *     ?after=2020-01-01
     *     ?after=2020-12-01
     */
    router.get('/job', async (req, res) => {
        try {
            if (req.query.status) req.query.status = req.query.status.split(',');
            return res.json(await Job.list(pool, req.query));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/job/error Search for job runs with recent errors
     * @apiVersion 1.0.0
     * @apiName ErrorList
     * @apiGroup Job
     * @apiPermission public
     */
    router.get('/job/error', async (req, res) => {
        try {
            return res.json(await JobError.list(pool, req.query));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/job/error Create a new job error
     * @apiVersion 1.0.0
     * @apiName ErrorCreate
     * @apiGroup Job
     * @apiPermission admin
     */
    router.post('/job/error', async (req, res) => {
        try {
            await auth.is_admin(req);

            const joberror = new JobError(req.body.job, req.body.message);
            return res.json(await joberror.generate(pool));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/job/error/:job Mark a specific job error as confirmed or rejected
     * @apiVersion 1.0.0
     * @apiName ErrorManager
     * @apiGroup Job
     * @apiPermission admin
     *
     * @apiParam {Number} job Job ID
     */
    router.post('/job/error/:job', async (req, res) => {
        Param.int(req, res, 'job');

        try {
            await auth.is_flag(req, 'moderator');

            res.json(JobError.moderate(pool, ci, req.params.job, req.body));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/job/:job Get a given job by id
     * @apiVersion 1.0.0
     * @apiName Single
     * @apiGroup Job
     * @apiPermission public
     *
     * @apiParam {Number} job Job ID
     */
    router.get('/job/:job', async (req, res) => {
        Param.int(req, res, 'job');

        try {
            const job = await Job.from(pool, req.params.job);

            return res.json(job.json());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/job/:job/delta Job Stats Comparison
     * @apiVersion 1.0.0
     * @apiName SingleDelta
     * @apiGroup Job
     * @apiPermission public
     *
     * @apiParam {Number} job Job ID
     * @apiDescription
     *   Compare the stats of the given job against the current live data job
     *
     */
    router.get('/job/:job/delta', async (req, res) => {
        Param.int(req, res, 'job');

        try {
            const delta = await Job.delta(pool, req.params.job);

            return res.json(delta);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/job/:job/output/source.png Get the preview image for a given job
     * @apiVersion 1.0.0
     * @apiName SingleOutputPreview
     * @apiGroup Job
     * @apiPermission public
     *
     * @apiParam {Number} job Job ID
     */
    router.get('/job/:job/output/source.png', async (req, res) => {
        Param.int(req, res, 'job');
        Job.preview(req.params.job, res);
    });

    /**
     * @api {get} /api/job/:job/output/source.geojson.gz Get the raw data for a given job
     * @apiVersion 1.0.0
     * @apiName SingleOutputData
     * @apiGroup Job
     * @apiPermission public
     *
     * @apiParam {Number} job Job ID
     */
    router.get('/job/:job/output/source.geojson.gz', async (req, res) => {
        Param.int(req, res, 'job');

        try {
            await Job.data(pool, req.params.job, res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/job/:job/output/cache.zip Get the raw unprocessed data for a given job
     * @apiVersion 1.0.0
     * @apiName SingleOutputCache
     * @apiGroup Job
     * @apiPermission public
     *
     * @apiParam {Number} job Job ID
     */
    router.get('/job/:job/output/cache.zip', async (req, res) => {
        Param.int(req, res, 'job');
        Job.cache(req.params.job, res);
    });

    /**
     * @api {get} /api/job/:job/log Get the log file for a given job
     * @apiVersion 1.0.0
     * @apiName SingleLog
     * @apiGroup Job
     * @apiPermission public
     *
     * @apiParam {Number} job Job ID
     */
    router.get('/job/:job/log', async (req, res) => {
        Param.int(req, res, 'job');

        try {
            const job = await Job.from(pool, req.params.job);

            return res.json(await job.log());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {patch} /api/job/:job Update a given job
     * @apiVersion 1.0.0
     * @apiName JobPatch
     * @apiGroup Job
     * @apiPermission admin
     *
     * @apiParam {Number} job Job ID
     */
    router.patch('/job/:job', async (req, res) => {
        Param.int(req, res, 'job');

        try {
            await auth.is_admin(req);

            const job = await Job.from(pool, req.params.job);

            job.patch(req.body);

            await job.commit(pool, Run, Data, ci);

            await Run.ping(pool, ci, job);

            return res.json(job.json());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/dash/traffic Get daily session counts
     * @apiVersion 1.0.0
     * @apiName traffic
     * @apiGroup Analytics
     * @apiPermission admin
     */
    router.get('/dash/traffic', async (req, res) => {
        try {
            await auth.is_admin(req);

            res.json(await analytics.traffic());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/dash/collections List collections by their download popularity
     * @apiVersion 1.0.0
     * @apiName collections
     * @apiGroup Analytics
     * @apiPermission admin
     */
    router.get('/dash/collections', async (req, res) => {
        try {
            await auth.is_admin(req);

            res.json(await analytics.collections());
        } catch (err) {
            return Err.respond(err, res);
        }
    });


    /**
     * @api {post} /api/github/event Github APP event webhook
     * @apiVersion 1.0.0
     * @apiName Event
     * @apiGroup Github
     * @apiPermission admin
     */
    router.post('/github/event', async (req, res) => {
        if (!process.env.GithubSecret) return res.status(400).send('Invalid X-Hub-Signature');

        const ghverify = new WebhooksApi({
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
    });

    router.all('*', (req, res) => {
        return res.status(404).json({
            status: 404,
            message: 'API endpoint does not exist!'
        });
    });

    const srv = app.listen(5000, (err) => {
        if (err) return err;

        if (cb) return cb(srv, pool);

        console.log('ok - http://localhost:5000');
    });
}

module.exports = configure;
