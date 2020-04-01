'use strict';

const fs = require('fs');
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
    const Data = require('./lib/data');

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

    app.use('/api', router);

    router.use(bodyparser.urlencoded({ extended: true }));
    router.use(morgan('combined'));
    router.use(bodyparser.json());

    /**
     * Return basic data about the API
     */
    app.get('/api', (req, res) => {
        return res.json({
            version: pkg.version
        });
    });

    /**
     * Return a successful healthcheck
     */
    app.get('/health', (req, res) => {
        return res.json({
            healthy: true,
            message: 'I work all day, I work all night to get the data I have to serve!'
        });
    });

    router.post('/user', async (req, res) => {
        auth.register(req.body);
    });

    router.post('/login', async (req, res) => {
        try {
            const user = await Auth.login(pool, req.body);

            return res.json(user);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    router.get('/map', (req, res) => {
        return res.json(Bin.map());
    });

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
     * Search for processed data by various criteria
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
     * Search for runs by various criteria
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
     * Create a new run, a run is a top level object
     * that acts as a container for a given subset of jobs
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
     * Get a specific run
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
     * Given an array sources, explode it into multiple jobs and submit to batch
     * or pass in a predefined list of sources/layer/names
     *
     * Note: once jobs are attached to a run, the run is "closed" and subsequent
     * jobs cannot be attached to it
     *
     * Example of both formats:
     * ['https://github.com/path_to_source', {
     *     "source": "https://github/path_to_source",
     *     "layer": "addresses",
     *     "name": "dcgis"
     * }]
     *
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
     * Get all the jobs associated with a run
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
     * Return the last 100 jobs
     */
    router.get('/job', async (req, res) => {
        try {
            return res.json(await Job.list(pool, req.query));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    router.get('/job/:job', async (req, res) => {
        Param.int(req, res, 'job');

        try {
            const job = await Job.from(pool, req.params.job);

            return res.json(job.json());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    router.get('/job/:job/output/source.png', async (req, res) => {
        Param.int(req, res, 'job');
        Job.preview(req.params.job, res);
    });

    router.get('/job/:job/output/source.geojson.gz', async (req, res) => {
        Param.int(req, res, 'job');
        Job.data(req.params.job, res);
    });

    router.get('/job/:job/output/cache.zip', async (req, res) => {
        Param.int(req, res, 'job');
        Job.data(req.params.job, res);
    });

    router.get('/job/:job/log', async (req, res) => {
        Param.int(req, res, 'job');

        try {
            const job = await Job.from(pool, req.params.job);

            return res.json(await job.log());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    router.patch('/job/:job', async (req, res) => {
        Param.int(req, res, 'job');

        try {
            const job = await Job.from(pool, req.params.job);

            job.patch(req.body);

            await job.commit(pool, Run, Data);

            return res.json(job.json());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

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

        if (cb) return cb(srv);

        console.log('ok - http://localhost:5000');
    });
}

module.exports = configure;
