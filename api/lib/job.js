'use strict';

const Err = require('./error');
const request = require('request');
const AWS = require('aws-sdk');
const S3 = require('./s3');
const pkg  = require('../package.json');

const cwl = new AWS.CloudWatchLogs({ region: process.env.AWS_DEFAULT_REGION });
const lambda = new AWS.Lambda({ region: process.env.AWS_DEFAULT_REGION });

class Job {
    constructor(run, source, layer, name) {
        if (typeof run !== 'number') throw new Error('Job.run must be numeric');
        if (typeof source !== 'string') throw new Error('Job.source must be a string');
        if (typeof layer !== 'string') throw new Error('Job.layer must be a string');
        if (typeof name !== 'string') throw new Error('Job.name must be a string');

        this.id = false,
        this.run = run;
        this.created = false;
        this.source = source;
        this.source_name = this.fullname();
        this.layer = layer;
        this.name = name;
        this.output = false;
        this.loglink = false;
        this.status = 'Pending';
        this.version = pkg.version,
        this.stats = {};
        this.bounds = false;

        // Attributes which are allowed to be patched
        this.attrs = ['output', 'loglink', 'status', 'version'];

        this.raw = false;
    }

    get_raw() {
        return new Promise((resolve, reject) => {
            if (!this.raw) {
                request({
                    url: this.source,
                    method: 'GET',
                    json: true
                }, (err, res) => {
                    if (err) return reject(err);

                    this.raw = res.body;

                    return resolve(this.raw);
                });
            } else {
                return resolve(this.raw);
            }
        });
    }

    fullname() {
        return this.source
            .replace(/.*sources\//, '')
            .replace(/\.json/, '');
    }

    json() {
        return {
            id: parseInt(this.id),
            run: parseInt(this.run),
            created: this.created,
            source_name: this.source_name,
            source: this.source,
            layer: this.layer,
            name: this.name,
            output: this.output,
            loglink: this.loglink,
            status: this.status,
            version: this.version
        };
    }

    /**
     * List & Filter Jobs
     *
     * @param {Pool} pool - Postgres Pool instance
     * @param {Object} query - Query object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.run=false] - Only show jobs associated with a given run
     */
    static async list(pool, query) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;

        const where = [];

        if (!query.run) {
            query.run = false;
        } else {
            query.run = parseInt(query.run);

            if (isNaN(query.run)) {
                throw new Err(400, null, 'run param must be integer');
            }

            where.push(`run = ${query.run}`);
        }

        let pgres;
        try {
            if (!where.length) {
                pgres = await pool.query(`
                    SELECT
                        *
                    FROM
                        job
                    ORDER BY
                        created DESC
                    LIMIT $1
                `, [
                    query.limit
                ]);
            } else {
                pgres = await pool.query(`
                    SELECT
                        *
                    FROM
                        job
                    WHERE
                        ${where.join(' AND ')}
                    ORDER BY
                        created DESC
                    LIMIT $1
                `, [
                    query.limit
                ]);
            }
        } catch (err) {
            throw new Err(500, err, 'Failed to load jobs');
        }

        if (!pgres.rows.length) {
            throw new Err(404, null, 'No job by that id');
        }

        return pgres.rows.map((job) => {
            job.id = parseInt(job.id);
            job.run = parseInt(job.run);

            return job;
        });
    }

    static from(pool, id) {
        return new Promise((resolve, reject) => {
            pool.query(`
                SELECT
                    *
                FROM
                    job
                WHERE
                    id = $1
            `, [id], (err, pgres) => {
                if (err) return reject(new Err(500, err, 'failed to load job'));

                if (!pgres.rows.length) {
                    return reject(new Err(404, null, 'no job by that id'));
                }

                pgres.rows[0].id = parseInt(pgres.rows[0].id);
                pgres.rows[0].run = parseInt(pgres.rows[0].run);

                const job = new Job(
                    pgres.rows[0].run,
                    pgres.rows[0].source,
                    pgres.rows[0].layer,
                    pgres.rows[0].name
                );

                for (const key of Object.keys(pgres.rows[0])) {
                    job[key] = pgres.rows[0][key];
                }

                return resolve(job);
            });
        });
    }

    patch(patch) {
        for (const attr of this.attrs) {
            if (patch[attr] !== undefined) {
                this[attr] = patch[attr];
            }
        }
    }

    static preview(job_id, res) {
        const s3 = new S3({
            Bucket: process.env.Bucket,
            Key: `${process.env.StackName}/job/${job_id}/source.png`
        });

        return s3.stream(res);
    }

    static async data(pool, job_id, res) {
        const job = await Job.from(pool, job_id);

        const s3 = new S3({
            Bucket: process.env.Bucket,
            Key: `${process.env.StackName}/job/${job_id}/source.geojson.gz`
        });

        return s3.stream(res, `${job.source_name}-${job.layer}-${job.name}.geojson.gz`);
    }

    static cache(job_id, res) {
        const s3 = new S3({
            Bucket: process.env.Bucket,
            Key: `${process.env.StackName}/job/${job_id}/cache.zip`
        });

        return s3.stream(res);
    }

    commit(pool) {
        return new Promise((resolve, reject) => {
            pool.query(`
                UPDATE job
                    SET
                        output = $1,
                        loglink = $2,
                        status = $3,
                        version = $4
                    WHERE
                        id = $5
            `, [this.output, this.loglink, this.status, this.version, this.id], async (err) => {
                if (err) return reject(new Err(500, err, 'failed to save job'));

                return resolve(this);
            });
        });
    }

    log() {
        return new Promise((resolve, reject) => {
            if (!this.loglink) return reject(new Err(404, null, 'Job has not produced a log'));

            cwl.getLogEvents({
                logGroupName: '/aws/batch/job',
                logStreamName: this.loglink
            }, (err, res) => {
                if (err) return reject(new Err(500, err, 'Could not retrieve logs' ));

                let line = 0;
                return resolve(res.events.map((event) => {
                    return {
                        id: ++line,
                        timestamp: event.timestamp,
                        message: event.message
                            .replace(/access_token=[ps]k\.[A-Za-z0-9.-]+/, '<REDACTED>')
                    };
                }));
            });
        });
    }

    generate(pool) {
        return new Promise((resolve, reject) => {
            if (!this.run) return reject(new Err(400, null, 'Cannot generate a job without a run'));
            if (!this.source) return reject(new Err(400, null, 'Cannot generate a job without a source'));
            if (!this.layer) return reject(new Err(400, null, 'Cannot generate a job without a layer'));
            if (!this.name) return reject(new Err(400, null, 'Cannot generate a job without a name'));

            pool.query(`
                INSERT INTO job (
                    run,
                    created,
                    source_name,
                    source,
                    layer,
                    name,
                    status,
                    version,
                    output
                ) VALUES (
                    $1,
                    NOW(),
                    $2,
                    $3,
                    $4,
                    $5,
                    'Pending',
                    $6,
                    $7
                ) RETURNING *
            `, [
                this.run,
                this.source_name,
                this.source,
                this.layer,
                this.name,
                this.version,
                { cache: false, output: false, preview: false }
            ], (err, pgres) => {
                if (err) return reject(new Err(500, err, 'failed to generate job'));

                for (const key of Object.keys(pgres.rows[0])) {
                    this[key] = pgres.rows[0][key];
                }

                return resolve(this);
            });
        });
    }

    batch() {
        return new Promise((resolve, reject) => {
            if (!this.id) return reject(new Err(400, null, 'Cannot batch a job without an ID'));

            if (process.env.StackName === 'test') {
                return resolve(true);
            } else {
                lambda.invoke({
                    FunctionName: `${process.env.StackName}-invoke`,
                    InvocationType: 'Event',
                    LogType: 'Tail',
                    Payload: JSON.stringify({
                        job: this.id,
                        source: this.source,
                        layer: this.layer,
                        name: this.name
                    })
                }, (err, data) => {
                    if (err) return reject(new Err(500, err, 'failed to submit job to batch'));

                    return resolve(data);
                });
            }
        });
    }
}

module.exports = Job;
