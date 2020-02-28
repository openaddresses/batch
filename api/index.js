#!/usr/bin/env node

const express = require('express');
const request = require('request');
const config = require('./package.json');
const minify = require('express-minify');
const bodyparser = require('body-parser');
const args = require('minimist')(process.argv, {
    boolean: ['help'],
    string: ['postgres', 'secret']
});

const router = express.Router();
const app = express();
const {Pool} = require('pg');

if (!args.postgres && !process.env.POSTGRES) {
    throw new Error('No postgres connection given');
}

if (!process.env.StackName) {
    throw new Error('No StackName env var set');
}

const pool = new Pool({
    connectionString: args.postgres ? args.postgres : process.env.POSTGRES
});

app.disable('x-powered-by');
app.use('/api', router);
app.use(minify());

router.use(bodyparser.urlencoded({ extended: true }));
router.use(bodyparser.json());

const SECRET = args.secret ? args.secret : process.env.SharedSecret;

const Run = require('./lib/run');
const Job = require('./lib/job');

/**
 * Return a successful healthcheck
 */
app.get('/', (req, res) => {
    return res.json({
        healthy: true
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

        res.json(pgres.rows);
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
        return res.status(500).send({
            status: 500,
            error: err.message
        });
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
        return res.status(500).send({
            status: 500,
            error: err.message
        });
    }
});

router.patch('/run/:run', async (req, res) => {
    try {
        const run = await Run.from(req.params.run);

        run.patch(req.body);

        await run.commit(pool)

        return res.json(run.json());
    } catch (err) {
        return res.status(500).send({
            status: 500,
            error: err.message
        });
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
router.post('run/:run/jobs', (req, res) => {
    if (!Array.isArray(req.body)) {
        return res.status(400).send({
            status: 400,
            error: 'jobs body must be array'
        });
    }

    for (const job in req.body) {
        if (!job) return //ERROR
        if (typeof job === 'string' && doesn't start with https://github.com) return // ERROR

            request({
                url: req.body.url,
                method: 'GET',
                json: true
            }, (err, rres) => {

            });
        });
});

/**
 * Get all the jobs associated with a run
 */
router.get('run/:run/jobs', (req, res) => {

});

router.get('/job/:job', (req, res) => {
    Job.from(req.params.job, (err, run) => {
        if (err) throw err;

        return res.json(run.json());
    });
});

router.patch('/job/:job', (req, res) => {
    Job.from(req.params.job, (err, run) => {

    });
});

app.listen(5000, (err) => {
    if (err) return err;

    console.log(`Server listening on port 5000`);
});
