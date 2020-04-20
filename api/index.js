'use strict';

const fs = require('fs');
const session = require('express-session');
const ghverify = require('@octokit/webhooks/verify');
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


async function server(args, config, cb) {
    // these must be run after lib/config
    const Bin = require('./lib/bin');
    const ci = new (require('./lib/ci'))(config);
    const Err = require('./lib/error');
    const Run = require('./lib/run');
    const Job = require('./lib/job');
    // const JobError = require('./lib/joberror');
    const Data = require('./lib/data');
    const Schedule = require('./lib/schedule');

    let postgres = process.env.POSTGRES;

    if (args.postgres) {
        postgres = args.postgres;
    } else if (!postgres) {
        postgres = 'postgres://postgres@localhost:5432/openaddresses';
    }

    const pool = new Pool({
        connectionString: postgres
    });

    try {
        await pool.query(String(fs.readFileSync(path.resolve(__dirname, 'schema.sql'))));

        if (args.populate) {
            await Bin.populate(pool);
        }
    } catch (err) {
        throw new Error(err);
    }

    const auth = new (require('./lib/auth'))(pool);

    app.disable('x-powered-by');
    app.use(minify());
    app.use(express.static('web/dist'));

    /**
     * @api {get} /api Get API metadata
     * @apiVersion 1.0.0
     * @apiName Meta
     * @apiGroup Server
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

    router.use(session({
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

    router.use(bodyparser.urlencoded({ extended: true }));
    router.use(morgan('combined'));
    router.use(bodyparser.json());

    /**
     * @api {post} /api/health Create a new user
     * @apiVersion 1.0.0
     * @apiName Create
     * @apiGroup User
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
     * @api {get} /api/login If the user has an active session, reauthenticate the frontend
     * @apiVersion 1.0.0
     * @apiName get
     * @apiGroup Login
     */
    router.get('/login', async (req, res) => {
        if (req.session && req.session.auth && req.session.auth.username) {
            return res.json({
                username: req.session.auth.username
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
     * @api {post} /api/schedule Kick off the scheduled full rebuild
     * @apiVersion 1.0.0
     * @apiName Schedule
     * @apiGroup Schedule
     */
    router.post('/schedule', async (req, res) => {
        try {
            await Schedule.event(pool);

            return res.json(true);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/map Return a TileJSON document for data coverage layers
     * @apiVersion 1.0.0
     * @apiName TileJSON
     * @apiGroup Map
     */
    router.get('/map', (req, res) => {
        return res.json(Bin.map());
    });

    /**
     * @api {get} /api/map/:z/:x/:y.mvt Return a given Mapbox Vector Tile
     * @apiVersion 1.0.0
     * @apiName VectorTile
     * @apiGroup Map
     *
     * @apiParam {Number} z Z coordinate
     * @apiParam {Number} x X coordinate
     * @apiParam {Number} y Y coordinate
     */
    router.get('/map/:z/:x/:y.mvt', async (req, res) => {
        try {
            const tile = await Bin.tile(pool, req.params.z, req.params.x, req.params.y);

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
     * @api {get} /api/data/:data Return full job history for a given data ID
     * @apiVersion 1.0.0
     * @apiName SingleHistory
     * @apiGroup Data
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
     * @api {post} /api/run Create a new run for a set of jobs
     * @apiVersion 1.0.0
     * @apiName Create
     * @apiGroup Run
     */
    router.post('/run', async (req, res) => {
        try {
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
     *
     * @apiParam {Number} run Run ID
     */
    router.patch('/run/:run', async (req, res) => {
        Param.int(req, res, 'run');

        try {
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
     *
     * @apiDescription
     *     Given an array sources, explode it into multiple jobs and submit to batch
     *     or pass in a predefined list of sources/layer/names
     *
     *     Note: once jobs are attached to a run, the run is "closed" and subsequent
     *     jobs cannot be attached to it
     *
     * @apiParam {Number} run Run ID
     * @apiParam {json} body Jobs to attach to run
     * @apiParamExample {json} body
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
     * //TODO
     * @api {get} /api/job/errors Search for job runs with recent errors
     * @apiVersion 1.0.0
     * @apiName ErrorsList
     * @apiGroup Job
     */
    router.get('/job/errors', async (req, res) => {
        try {
            if (req.query.status) req.query.status = req.query.status.split(',');
            return res.json(await Job.list(pool, req.query));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/job/:job Get a given job by id
     * @apiVersion 1.0.0
     * @apiName Single
     * @apiGroup Job
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
     * @api {get} /api/job/:job/output/source.png Get the preview image for a given job
     * @apiVersion 1.0.0
     * @apiName SingleOutputPreview
     * @apiGroup Job
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
     *
     * @apiParam {Number} job Job ID
     */
    router.get('/job/:job/output/cache.zip', async (req, res) => {
        Param.int(req, res, 'job');
        Job.data(req.params.job, res);
    });

    /**
     * @api {get} /api/job/:job/log Get the log file for a given job
     * @apiVersion 1.0.0
     * @apiName SingleLog
     * @apiGroup Job
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
     * @apiName SingleLog
     * @apiGroup Job
     *
     * @apiParam {Number} job Job ID
     */
    router.patch('/job/:job', async (req, res) => {
        Param.int(req, res, 'job');

        try {
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
     * @api {post} /api/github/event Github APP event webhook
     * @apiVersion 1.0.0
     * @apiName Event
     * @apiGroup Github
     */
    router.post('/github/event', async (req, res) => {
        if (!process.env.GithubSecret) return res.status(400).send('Invalid X-Hub-Signature');

        if (!ghverify(
            process.env.GithubSecret,
            req.body,
            req.headers['x-hub-signature']
        )) {
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

    const srv = app.listen(5000, (err) => {
        if (err) return err;

        if (cb) return cb(srv, pool);

        console.log('ok - http://localhost:5000');
    });
}

module.exports = configure;
