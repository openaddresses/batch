const fs = require('fs');
const Err = require('./lib/error');
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
    string: ['postgres', 'secret'],
});

const Run = require('./lib/run');
const Job = require('./lib/job');

const webhooks = new Webhooks({
    secret: process.env.GithubSecret
});

const router = express.Router();
const app = express();
const {Pool} = require('pg');

if (require.main === module) {
    server(args);
}

async function server(args, cb) {
    if (!args.postgres && !process.env.POSTGRES) {
        throw new Error('No postgres connection given');
    }

    if (!process.env.StackName) {
        console.error('ok - StackName not set - disabling AWS calls');
        process.env.StackName = 'test';
    }

    const pool = new Pool({
        connectionString: args.postgres ? args.postgres : process.env.POSTGRES
    });

    try {
        await pool.query(String(fs.readFileSync(path.resolve(__dirname, 'schema.sql'))));
    } catch(err) {
        throw err;
    }

    app.disable('x-powered-by');
    app.use(minify());

    app.use('/api', router);

    router.use(bodyparser.urlencoded({ extended: true }));
    router.use(morgan('combined'));
    router.use(bodyparser.json());

    const SECRET = args.secret ? args.secret : process.env.SharedSecret;

    /**
     * Return a successful healthcheck
     */
    app.get('/', (req, res) => {
        return res.json({
            healthy: true,
            message: 'I work all day, I work all night to get the data I have to serve!'
        });
    });

    /**
     * Return basic data about the API
     */
    app.get('/api', (req, res) => {
        return res.json({
            version: config.version
        });
    });

    /*
     * Search for processed data by various criteria
     */
    router.get('/data', (req, res) => {
        // Allow getting S3 links in various ways
        // - bbox
        // - name prefix
        // - layer
    });

    /**
     * Search for runs by various criteria
     */
    router.get('/run', (req, res) => {
        pool.query(`
            SELECT
                *
            FROM
                runs
            ORDER BY
                created DESC
            LIMIT 100
        `, (err, pgres) => {
            if (err) throw err;

            res.json(pgres.rows.map((run) => {
                run.id = parseInt(run.id);

                return run;
            }));
        });
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
        try {
            const run = await Run.from(req.params.run)

            return res.json(run.json());
        } catch (err) {
            return err.res(res);
        }
    });

    router.patch('/run/:run', async (req, res) => {
        try {
            const run = await Run.from(req.params.run);

            run.patch(req.body);

            await run.commit(pool)

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
        if (!Array.isArray(req.body.jobs)) {
            return res.status(400).send({
                status: 400,
                error: 'jobs body must be array'
            });
        }

        let jobs = []

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
                    jobs = jobs.concat(await util.explode(job))
                } catch(err) {
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
                } catch(err) {
                    console.error(err);
                    // TODO return list of successful ids
                    return res.status(400).send({
                        status: 400,
                        error: 'jobs only partially queued',
                    });
                }
            }

            await Run.close(pool, req.params.run);

            res.json({
                jobs: jobs.map((job) => {
                    return job.json().id;
                })
            });
        }
    });

    /**
     * Get all the jobs associated with a run
     */
    router.get('run/:run/jobs', (req, res) => {

    });

    /**
     * Return the last 100 jobs
     */
    router.get('/job', async (req, res) => {
        pool.query(`
            SELECT
                *
            FROM
                job
            ORDER BY
                created DESC
            LIMIT 100
        `, (err, pgres) => {
            if (err) throw err;

            res.json(pgres.rows.map((job) => {
                job.id = parseInt(job.id);

                return job;
            }));
        });
    });

    router.get('/job/:job', async (req, res) => {
        try {
            const job = await Job.from(req.params.job)

            return res.json(job);
        } catch(err) {
            return err.res(res);
        }
    });

    router.get('/job/:job/log', async (req, res) => {
        try {
            const job = await Job.from(req.params.job)

            return res.json(await job.loglink());
        } catch(err) {
            return err.res(res);
        }
    });

    router.patch('/job/:job', async (req, res) => {
        try {
            const job = await Job.from(req.params.job)
        } catch(err) {
            return err.res(res);
        }
    });

    router.post('/github/event', async (req, res) => {
        try {
            await webhooks.verify({
                payload: req.body,
                signature: request.headers['x-hub-signature']
            });
        } catch(err) {
            res.status(400).body('Invalid X-Hub-Signature');
        }

        try {
            await CI.event(res.body);

            res.json(true);
        } catch(err) {
            return err.res(res);
        }
    });

    const srv = app.listen(5000, (err) => {
        if (err) return err;

        if (cb) return cb(srv);

        console.log(`Server listening on port 5000`);
    });
}

module.exports = server;
