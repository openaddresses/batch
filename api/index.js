'use strict';

const fs = require('fs');
const {pipeline} = require('stream');
const Webhooks = require('@octokit/webhooks');
const path = require('path');
const morgan = require('morgan');
const CI = require('./lib/ci');
const util = require('./lib/util');
const express = require('express');
const request = require('request');
const config = require('./package.json');
const minify = require('express-minify');
const bodyparser = require('body-parser');
const args = require('minimist')(process.argv, {
    boolean: ['help'],
    string: ['postgres', 'secret']
});

const Run = require('./lib/run');
const Job = require('./lib/job');
const Data = require('./lib/data');

require('./lib/config')();

const Param = util.Param;
const webhooks = new Webhooks({
    secret: process.env.GithubSecret
});

const router = express.Router();
const app = express();
const { Pool } = require('pg');

if (require.main === module) {
    server(args);
}

async function server(args, cb) {
    let postgres = process.env.POSTGRES;

    if (args.postgres) {
        postgres = args.postgres;
    } else if (!postgres) {
        postgres = 'postgres://postgres@localhost:5432/openaddresses';
    }

    if (!process.env.StackName) {
        console.error('ok - StackName not set - disabling AWS calls');
        process.env.StackName = 'test';
    }

    const pool = new Pool({
        connectionString: postgres
    });

    try {
        await pool.query(String(fs.readFileSync(path.resolve(__dirname, 'schema.sql'))));
    } catch (err) {
        throw new Error(err);
    }

    app.disable('x-powered-by');
    app.use(minify());
    app.use(express.static('web/dist'))

    app.use('/api', router);

    router.use(bodyparser.urlencoded({ extended: true }));
    router.use(morgan('combined'));
    router.use(bodyparser.json());

    // TODO: Auth with shared secret
    // const SECRET = args.secret ? args.secret : process.env.SharedSecret;

    /**
     * Return basic data about the API
     */
    app.get('/api', (req, res) => {
        return res.json({
            version: config.version
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

    /**
     * Search for processed data by various criteria
     */
    router.get('/data', async (req, res) => {
        try {
            const data = await Data.list(pool, req.query);

            return res.json(data);
        } catch (err) {
            return err.res(res);
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
            return err.res(res);
        }
    });

    /**
     * Create a new run, a run is a top level object
     * that acts as a container for a given subset of jobs
     */
    router.post('/run', async (req, res) => {
        try {
            const run = await Run.generate(pool);

            return res.json(run.json());
        } catch (err) {
            return err.res(res);
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
            return err.res(res);
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
            return err.res(res);
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

        let jobs = [];

        for (const job of req.body.jobs) {
            if (!job) {
                return res.status(400).send({
                    status: 400,
                    error: 'job element cannot be null'
                });
            } else if (
                typeof job === 'string'
                && !/https:\/\/github\.com\//.test(job)
                && !/https:\/\/raw\.githubusercontent\.com\//.test(job)
            ) {
                return res.status(400).send({
                    status: 400,
                    error: 'job must reference github.com'
                });
            } else if (job.source) {
                jobs.push(job);
            } else if (typeof job === 'string') {
                try {
                    jobs = jobs.concat(await util.explode(job));
                } catch (err) {
                    return res.status(500).send({
                        status: 400,
                        error: 'failed to generate jobs'
                    });
                }
            } else {
                return res.status(400).send({
                    status: 400,
                    error: 'job must be string or job object'
                });
            }

            for (let i = 0; i < jobs.length; i++) {
                jobs[i] = new Job(req.params.run, jobs[i].source, jobs[i].layer, jobs[i].name);
                try {
                    await jobs[i].generate(pool);
                    await jobs[i].batch();
                } catch (err) {
                    console.error(err);
                    // TODO return list of successful ids
                    return res.status(400).send({
                        status: 400,
                        error: 'jobs only partially queued'
                    });
                }
            }

            await Run.close(pool, req.params.run);

            res.json({
                run: req.params.run,
                jobs: jobs.map((job) => {
                    return job.json().id;
                })
            });
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
            return err.res(res);
        }
    });

    /**
     * Return the last 100 jobs
     */
    router.get('/job', async (req, res) => {
        try {
            return res.json(await Job.list(pool));
        } catch (err) {
            return err.res(res);
        }
    });

    router.get('/job/:job', async (req, res) => {
        Param.int(req, res, 'job');

        try {
            const job = await Job.from(pool, req.params.job);

            return res.json(job.json());
        } catch (err) {
            return err.res(res);
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
            return err.res(res);
        }
    });

    router.patch('/job/:job', async (req, res) => {
        Param.int(req, res, 'job');

        try {
            const job = await Job.from(pool, req.params.job);

            job.patch(req.body);

            await job.commit(pool);

            return res.json(job.json());
        } catch (err) {
            return err.res(res);
        }
    });

    router.post('/github/event', async (req, res) => {
        if (!process.env.GithubSecret) return res.status(400).body('Invalid X-Hub-Signature');

        try {
            await webhooks.verify({
                payload: req.body,
                signature: request.headers['x-hub-signature']
            });
        } catch (err) {
            console.error('VALIDATION ERROR', err);
            res.status(400).body('Invalid X-Hub-Signature');
        }

        try {
            await CI.event(res.body);

            res.json(true);
        } catch (err) {
            return err.res(res);
        }
    });

    const srv = app.listen(5000, (err) => {
        if (err) return err;

        if (cb) return cb(srv);

        console.log('ok - http://localhost:5000');
    });
}

module.exports = server;
