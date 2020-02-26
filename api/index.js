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
    pool.query(`
        INSERT INTO runs (
            id,
            created,
            github
        ) VALUES (
            uuid_generate_v4(),
            NOW(),
            '{}'::JSONB
        ) RETURNING *
    `, (err, pgres) => {
        if (err) throw err;

        res.json(pgres.rows[0]);
    });
});

/**
 * Given a source, explode it into multiple jobs and submit to batch
 */
router.post('run/:run/batch', (req, res) => {
    request({
        url: req.body.url,
        method: 'GET',
        json: true
    }, (err, rres) => {

    });
});


router.get('/run/:run', (req, res) => {
    pool.query(`
        SELECT
            id,
            created,
            github
        FROM
            runs
        WHERE
            id = $1
    `, [ req.params.run ], (err, pgres) => {
        if (err) throw err;

        if (!pgres.rows.length) {
            res.json({
                error: 'I\'m a 404'
            });
        } else {
            res.json(pgres.rows[0]);
        }
    });
});


app.listen(5000, (err) => {
    if (err) return err;

    console.log(`Server listening on port 5000`);
});
