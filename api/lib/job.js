'use strict';

const Err = require('./error');
const AWS = require('aws-sdk');
const S3 = require('./s3');

const Run = require('./run');
const Data = require('./data');

const cwl = new AWS.CloudWatchLogs({ region: process.env.AWS_DEFAULT_REGION });
const lambda = new AWS.Lambda({ region: process.env.AWS_DEFAULT_REGION });

class Job {
    constructor(run, source, layer, name) {
        this.id = false,
        this.run = run;
        this.created = false;
        this.source = source;
        this.layer = layer;
        this.name = name;
        this.output = false;
        this.loglink = false;
        this.status = 'Pending';
        this.version = '0.0.0';

        // Attributes which are allowed to be patched
        this.attrs = ['output', 'loglink', 'status', 'version'];
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
            source: this.source,
            layer: this.layer,
            name: this.name,
            output: this.output,
            loglink: this.loglink,
            status: this.status,
            version: this.version
        };
    }
    static list(pool) {
        return new Promise((resolve, reject) => {
            pool.query(`
                SELECT
                    *
                FROM
                    job
                ORDER BY
                    created DESC
                LIMIT 100
            `, (err, pgres) => {
                if (err) return reject(new Err(500, err, 'failed to load jobs'));

                if (!pgres.rows.length) {
                    return reject(new Err(404, null, 'no job by that id'));
                }

                return resolve(pgres.rows.map((job) => {
                    job.id = parseInt(job.id);

                    return job;
                }));
            });
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

                const job = new Job();

                for (const key of Object.keys(pgres.rows[0])) {
                    job[key] = pgres.rows[0][key];
                }

                job.id = parseInt(job.id);

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

    static data(job_id, res) {
        const s3 = new S3({
            Bucket: process.env.Bucket,
            Key: `${process.env.StackName}/job/${job_id}/source.geojson.gz`
        });

        return s3.stream(res);
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

                await this.success(pool);

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
                    'Pending',
                    $5,
                    $6
                ) RETURNING *
            `, [
                this.run,
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

    async success(pool) {
        try {
            const run = await Run.from(pool, this.run);

            if (run.live) {
                return await Data.update(this);
            }  else {
                return false;
            }
        } catch(err) {
            throw err;
        }
    }
}

module.exports = Job;
