'use strict';

const Err = require('./error');
const moment = require('moment');
const turf = require('@turf/turf');
const request = require('request');
const AWS = require('aws-sdk');
const Data = require('./data');
const S3 = require('./s3');
const pkg  = require('../package.json');
const { Status } = require('./util');
const { sql  } = require('slonik');

const cwl = new AWS.CloudWatchLogs({ region: process.env.AWS_DEFAULT_REGION });
const batchjob = require('./batch').trigger;

/**
 * @class Job
 */
class Job {
    constructor(run, source, layer, name) {
        if (typeof run !== 'number') throw new Error('Job.run must be numeric');
        if (typeof source !== 'string') throw new Error('Job.source must be a string');
        if (typeof layer !== 'string') throw new Error('Job.layer must be a string');
        if (typeof name !== 'string') throw new Error('Job.name must be a string');

        this.id = false,
        this.run = run;
        this.map = null;
        this.created = false;
        this.source = source;
        this.source_name = this.fullname();
        this.layer = layer;
        this.name = name;
        this.license = false;
        this.output = {
            cache: false,
            output: false,
            preview: false
        };
        this.loglink = false;
        this.status = 'Pending';
        this.version = pkg.version,
        this.stats = {};
        this.count = 0;
        this.size = 0;
        this.bounds = false;
        this.s3 = false;

        // Attributes which are allowed to be patched
        this.attrs = Object.keys(require('../schema/req.body.PatchJob.json').properties);

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

    /**
     * Return a comparison of a given job id and the current live data job
     *
     * @param {Pool} pool - Postgres Pool instance
     * @param {Number} compare_id - Id of the job to comapre against live job
     *
     * @returns {Object} Delta comparison
     */
    static async delta(pool, compare_id) {
        const compare = await Job.from(pool, compare_id);
        if (compare.status !== 'Success') throw new Err(400, null, 'Job is not in Success state');

        const datas = await Data.list(pool, {
            source: compare.source_name,
            layer: compare.layer,
            name: compare.name
        });

        let master;
        if (datas.length > 1) {
            throw new Err(400, null, 'Job matches multiple live jobs');
        } else if (datas.length === 0) {
            throw new Err(400, null, 'Job does not match a live job');
        } else {
            master = await Job.from(pool, datas[0].job);
        }

        const stats = JSON.parse(JSON.stringify(compare.stats));
        for (const key of Object.keys(compare.stats)) {
            if (typeof compare.stats[key] === 'object') {
                for (const key_i of Object.keys(compare.stats[key])) {
                    if (master.stats[key]) {
                        stats[key][key_i] = compare.stats[key][key_i] - (master.stats[key][key_i] !== undefined ? master.stats[key][key_i] : 0);
                    } else {
                        stats[key][key_i] = compare.stats[key][key_i] - 0;
                    }
                }
            } else {
                stats[key] = compare.stats[key] - (master.stats[key] !== undefined ? master.stats[key] : 0);
            }
        }

        const geom = turf.difference(master.bounds, compare.bounds);
        return {
            compare: {
                id: compare.id,
                count: compare.count,
                stats: compare.stats,
                bounds: {
                    area: turf.area(compare.bounds),
                    geom: compare.bounds
                }
            },
            master: {
                id: master.id,
                count: master.count,
                stats: master.stats,
                bounds: {
                    area: turf.area(master.bounds),
                    geom: master.bounds
                }
            },
            delta: {
                count: master.count - compare.count,
                stats: stats,
                bounds: {
                    area: turf.area(master.bounds) - turf.area(compare.bounds),
                    diff_area: geom ? geom : 0,
                    geom: geom
                }
            }
        };
    }

    /**
     * Return the source_name of the source given the source url
     *
     * @returns {String} source_name
     */
    fullname() {
        return this.source
            .replace(/.*sources\//, '')
            .replace(/\.json/, '');
    }

    /**
     * Return a JSON representation of the job
     *
     * @returns {Object} JSON representation of object
     */
    json() {
        return {
            id: this.id ? parseInt(this.id) : false,
            size: parseInt(this.size),
            s3: this.s3,
            run: parseInt(this.run),
            license: this.license,
            map: this.map ? parseInt(this.map) : null,
            created: this.created,
            source_name: this.source_name,
            source: this.source,
            layer: this.layer,
            name: this.name,
            output: this.output,
            loglink: this.loglink,
            status: this.status,
            version: this.version,
            count: parseInt(this.count),
            bounds: this.bounds,
            stats: this.stats
        };
    }

    /**
     * Create a Job object given a JSON blob
     */
    static from_json(json) {
        const job = new Job(
            json.run,
            json.source,
            json.layer,
            json.name
        );

        for (const key of Object.keys(json)) {
            job[key] = json[key];
        }

        return job;
    }

    /**
     * List & Filter Jobs
     *
     * @param {Pool} pool - Postgres Pool instance
     * @param {Object} query - Query object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.run=false] - Only show jobs associated with a given run
     * @param {String} [query.live=undefined] - Only show jobs that are part of live runs
     * @param {String} [query.before=undefined] - Only show jobs before the given date
     * @param {String} [query.after=undefined] - Only show jobs after the given date
     * @param {String} [query.source=Null] - Filter results by source
     * @param {String[]} [query.status=["Success", "Fail", "Pending", "Warn"]] - Only show jobs with given status
     */
    static async list(pool, query) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;
        if (!query.source) query.source = '';
        if (!query.layer || query.layer === 'all') query.layer = '';
        if (!query.status) query.status = Status.list();

        if (!query.after) query.after = null;
        if (!query.before) query.before = null;
        if (!query.live) query.live = null;
        if (!query.run) query.run = null;

        Status.verify(query.status);

        query.source = '%' + query.source + '%';
        query.layer = query.layer + '%';

        if (query.after) {
            try {
                query.after = moment(query.after);
            } catch (err) {
                throw new Err(400, null, 'after param is not recognized as a valid date');
            }
        }

        if (query.before) {
            try {
                query.before = moment(query.before);
            } catch (err) {
                throw new Err(400, null, 'before param is not recognized as a valid date');
            }
        }

        let pgres;
        try {
            pgres = await pool.query(sql`
                SELECT
                    job.id,
                    job.run,
                    job.map,
                    job.created,
                    job.source,
                    job.source_name,
                    job.layer,
                    job.name,
                    job.output,
                    job.loglink,
                    job.status,
                    job.size
                FROM
                    job INNER JOIN runs
                        ON job.run = runs.id
                WHERE
                    ${sql.array(query.status.join(','), sql`TEXT[]`)} @> ARRAY[job.status]
                    AND job.layer ilike ${query.layer}
                    AND job.source ilike ${query.source}
                    AND (${query.run}::BIGINT IS NULL OR job.run = ${query.run})
                    AND (${query.after}::TIMESTAMP IS NULL OR job.created > ${query.after ? query.after.toDate().toISOString() : null}::TIMESTAMP)
                    AND (${query.before}::TIMESTAMP IS NULL OR job.created < ${query.before ? query.before.toDate().toISOString() : null}::TIMESTAMP)
                    AND (${query.run}::BIGINT IS NULL OR job.run = ${query.run})
                    AND (${query.live}::BOOLEAN IS NULL OR runs.live = ${query.live})
                ORDER BY
                    job.created DESC
                LIMIT
                    ${query.limit}
            `);
        } catch (err) {
            throw new Err(500, err, 'Failed to load jobs');
        }

        if (!pgres.rows.length) {
            throw new Err(404, null, 'No job found');
        }

        return pgres.rows.map((job) => {
            if (job.output && job.output.output) {
                job.s3 = `s3://${process.env.Bucket}/${process.env.StackName}/job/${job.id}/source.geojson.gz`;
            }

            return job;
        });
    }

    static async from(pool, id) {
        let pgres;
        try {
            pgres = await pool.query(sql`
                SELECT
                    id,
                    run,
                    map,
                    created,
                    source,
                    source_name,
                    layer,
                    name,
                    output,
                    loglink,
                    status,
                    stats,
                    count,
                    ST_AsGeoJSON(bounds)::JSON AS bounds,
                    version,
                    size
                FROM
                    job
                WHERE
                    id = ${id}
            `);
        } catch (err) {
            throw new Err(500, err, 'failed to load job');
        }

        if (!pgres.rows.length) {
            throw new Err(404, null, 'no job by that id');
        }

        pgres.rows[0].count = isNaN(parseInt(pgres.rows[0].count)) ? null : parseInt(pgres.rows[0].count);

        const job = new Job(
            pgres.rows[0].run,
            pgres.rows[0].source,
            pgres.rows[0].layer,
            pgres.rows[0].name
        );

        for (const key of Object.keys(pgres.rows[0])) {
            job[key] = pgres.rows[0][key];
        }

        if (job.output && job.output.output) {
            job.s3 = `s3://${process.env.Bucket}/${process.env.StackName}/job/${job.id}/source.geojson.gz`;
        }

        return job;
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

    static async sample(pool, job_id) {
        const s3 = new S3({
            Bucket: process.env.Bucket,
            Key: `${process.env.StackName}/job/${job_id}/source.geojson.gz`
        });

        return await s3.sample();
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

    async commit(pool) {
        if (this.id === false) throw new Err(500, null, 'Job.id must be populated');

        try {
            await pool.query(sql`
                UPDATE job
                    SET
                        output = ${this.output ? JSON.stringify(this.output) : null}::JSON,
                        loglink = ${this.loglink},
                        status = ${this.status},
                        version = ${this.version},
                        count = ${this.count},
                        stats = ${this.stats ? JSON.stringify(this.stats) : null}::JSON,
                        bounds = ST_GeomFromGeoJSON(${this.bounds ? JSON.stringify(this.bounds) : null}::JSON),
                        map = ${this.map},
                        size = ${this.size}
                    WHERE
                        id = ${this.id}
            `);

            return this;
        } catch (err) {
            throw new Err(500, err, 'failed to save job');
        }
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

    async generate(pool) {
        if (!this.run) throw new Err(400, null, 'Cannot generate a job without a run');
        if (!this.source) throw new Err(400, null, 'Cannot generate a job without a source');
        if (!this.layer) throw new Err(400, null, 'Cannot generate a job without a layer');
        if (!this.name) throw new Err(400, null, 'Cannot generate a job without a name');

        try {
            const pgres = await pool.query(sql`
                INSERT INTO job (
                    run,
                    created,
                    stats,
                    source_name,
                    source,
                    layer,
                    name,
                    status,
                    version,
                    output,
                    size,
                    license
                ) VALUES (
                    ${this.run},
                    NOW(),
                    '{}'::JSONB,
                    ${this.source_name},
                    ${this.source},
                    ${this.layer},
                    ${this.name},
                    'Pending',
                    ${this.version},
                    ${JSON.stringify(this.output)}::JSONB,
                    ${this.size},
                    ${this.license}
                ) RETURNING *
            `);

            for (const key of Object.keys(pgres.rows[0])) {
                this[key] = pgres.rows[0][key];
            }

            return this;
        } catch (err) {
            throw new Err(500, err, 'failed to generate job');
        }
    }

    /**
     * Submit the Job to AWS Batch for processing
     *
     * @param {Boolean} ci Should the job be submit to the CI queue (faster) or the default
     */
    async batch(ci) {
        if (!this.id) throw new Err(400, null, 'Cannot batch a job without an ID');

        if (process.env.StackName === 'test') {
            return true;
        } else {
            try {
                return await batchjob({
                    type: ci ? 'job-ci' : 'job',
                    job: this.id,
                    source: this.source,
                    layer: this.layer,
                    name: this.name
                });
            } catch (err) {
                throw new Err(500, err, 'failed to submit job to batch');
            }
        }
    }
}

module.exports = Job;
