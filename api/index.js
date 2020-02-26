#!/usr/bin/env node

const express = require('express');
const request = require('request');
const config = require('./package.json');
const minify = require('express-minify');
const bodyparser = require('body-parser');
const args = require('minimist')(process.argv, {
    boolean: ['help'],
    string: ['postgres']
});

const router = express.Router();
const app = express();
const {Pool} = require('pg');

const pool = new Pool({
    connectionString: args.postgres ? args.postgres : process.env.POSTGRES
});

app.disable('x-powered-by');
app.use('/api', router);
app.use(minify());

router.use(bodyparser.urlencoded({ extended: true }));
router.use(bodyparser.json());


const Run = require('./lib/run');

app.get('/', (req, res) => {
    return res.json({
        healthy: true
    });
});

app.get('/api', (req, res) => {
    return res.json({
        version: config.version
    });
});

router.get('/data', (req, res) => {
    // Allow getting S3 links in various ways
    // - bbox
    // - name prefix
    // - layer
});

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

router.post('/run', (req, res) => {
    const run = new Run();
    run.generate();

    return res.json(run.json());
});

/**
 * Given an array sources, explode it into multiple jobs and submit to batch
 * or pass in a predefined list of sources/layer/names
 * 
 * Note: once jobs are attached to a run, the run is "closed" and subsequent
 * jobs cannot be attached to it
 */
router.post('run/:run/jobs', (req, res) => {
    request({
        url: req.body.url,
        method: 'GET',
        json: true
    }, (err, rres) => {

    });
});


router.get('/run/:run', (req, res) => {
    Run.from(req.params.run, (err, run) => {
        if (err) throw err;

        return res.json(run.json());
    });
});


app.listen(5000, (err) => {
    if (err) return err;

    console.log(`Server listening on port 5000`);
});
