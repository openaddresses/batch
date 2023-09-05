import Err from '@openaddresses/batch-error';
import Generic, { Params } from '@openaddresses/batch-generic';
import moment from 'moment';
import { difference, area } from '@turf/turf';
import AWS from 'aws-sdk';
import Data from './data.js';
import { Status } from '../util.js';
import { sql } from 'slonik';
import { stringify } from 'csv-stringify/sync';
import fs from 'fs';
import { trigger } from '../batch.js';
import request from 'request';
import { promisify } from 'util';

const prequest = promisify(request);
const cwl = new AWS.CloudWatchLogs({ region: process.env.AWS_DEFAULT_REGION });
const pkg  = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url)));

/**
 * @class
 */
export default class Job extends Generic {
    static _table = 'job';

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
    static async list(pool, query={}) {
        query.limit = Params.integer(query.limit, { default: 100 });
        query.page = Params.integer(query.page, { default: 0 });
        query.source = Params.string(query.source, { default: '' });
        query.run = Params.integer(query.run);
        query.sort = Params.string(query.sort, { default: 'id' });
        query.order = Params.order(query.order);

        if (!query.layer || query.layer === 'all') query.layer = '';
        if (!query.live || query.live === 'all') query.live = null;
        if (!query.status) query.status = Status.list();

        if (!query.after) query.after = null;
        if (!query.before) query.before = null;

        Status.verify(query.status);

        query.source = '%' + query.source + '%';
        query.layer = query.layer + '%';

        if (query.after) {
            try {
                query.after = moment(query.after);
            } catch (err) {
                throw new Err(400, err, 'after param is not recognized as a valid date');
            }
        }

        if (query.before) {
            try {
                query.before = moment(query.before);
            } catch (err) {
                throw new Err(400, err, 'before param is not recognized as a valid date');
            }
        }

        let pgres;

        try {
            pgres = await pool.query(sql`
                SELECT
                    count(*) OVER() AS count,
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
                    ${sql.array(query.status, sql`TEXT[]`)} @> ARRAY[job.status]
                    AND job.layer ilike ${query.layer}
                    AND job.source ilike ${query.source}
                    AND (${query.run}::BIGINT IS NULL OR job.run = ${query.run})
                    AND (${query.after ? query.after.toDate().toISOString() : null}::TIMESTAMP IS NULL OR job.created > ${query.after ? query.after.toDate().toISOString() : null}::TIMESTAMP)
                    AND (${query.before ? query.before.toDate().toISOString() : null}::TIMESTAMP IS NULL OR job.created < ${query.before ? query.before.toDate().toISOString() : null}::TIMESTAMP)
                    AND (${query.run}::BIGINT IS NULL OR job.run = ${query.run})
                    AND (${query.live}::BOOLEAN IS NULL OR runs.live = ${query.live})
                ORDER BY
                    ${sql.identifier([this._table, query.sort])} ${query.order}
                LIMIT
                    ${query.limit}
                OFFSET
                    ${query.limit * query.page}
            `);
        } catch (err) {
            throw new Err(500, err, 'Failed to load jobs');
        }

        const list = this.deserialize_list(pgres, 'jobs');

        list.jobs.map((job) => {
            if (job.output && job.output.output) {
                job.s3 = `s3://${process.env.Bucket}/${process.env.StackName}/job/${job.id}/source.geojson.gz`;
            }

            if (job.output && job.output.validated) {
                job.s3_validated = `s3://${process.env.Bucket}/${process.env.StackName}/job/${job.id}/validated.geojson.gz`;
            }

            return job;
        });

        return list;
    }

    async get_raw() {
        if (!this.raw) {
            const res = await prequest({
                url: this.source,
                json: true
            });

            this.raw = res.body;
        }

        return this.raw;
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

        const geom = difference(master.bounds, compare.bounds);
        return {
            compare: {
                id: compare.id,
                count: compare.count,
                stats: compare.stats,
                bounds: {
                    area: area(compare.bounds),
                    geom: compare.bounds
                }
            },
            master: {
                id: master.id,
                count: master.count,
                stats: master.stats,
                bounds: {
                    area: area(master.bounds),
                    geom: master.bounds
                }
            },
            delta: {
                count: master.count - compare.count,
                stats: stats,
                bounds: {
                    area: area(master.bounds) - area(compare.bounds),
                    diff_area: geom ? geom : 0,
                    geom: geom
                }
            }
        };
    }

    /**
     * Return the source_name of the source given the source url
     *
     * @param {String} source
     * @returns {String} source_name
     */
    static fullname(source) {
        return source
            .replace(/.*sources\//, '')
            .replace(/\.json/, '');
    }

    serialize() {
        const job = super.serialize();

        if (job.license) {
            try {
                job.license = JSON.parse(job.license);
            } catch (err) {
                job.license = true;
            }
        }

        if (job.output && job.output.output) {
            job.s3 = `s3://${process.env.Bucket}/${process.env.StackName}/job/${job.id}/source.geojson.gz`;
        }

        if (job.output && job.output.validated) {
            job.s3_validated = `s3://${process.env.Bucket}/${process.env.StackName}/job/${job.id}/validated.geojson.gz`;
        }

        return job;
    }

    async log(format = 'json') {
        if (!this.loglink) throw new Err(404, null, 'Job has not produced a log');

        let events = [];

        try {
            const res = await cwl.getLogEvents({
                logGroupName: '/aws/batch/job',
                logStreamName: this.loglink,
                startFromHead: true
            }).promise();

            events = res.events;
        } catch (err) {
            throw new Err(500, err, 'Could not retrieve logs');
        }

        let line = 0;
        events = events.map((event) => {
            return {
                id: ++line,
                timestamp: event.timestamp,
                message: event.message
                    .replace(/access_token=[ps]k\.[A-Za-z0-9.-]+/, '<REDACTED>')
            };
        });

        if (format === 'json') {
            return events;
        } else if (format === 'csv') {
            return stringify(events.map((e) => [e.id, e.timestamp, e.message]), {
                delimiter: ','
            });
        } else {
            throw new Err(400, null, 'Unsupported Format');
        }
    }

    static async generate(pool, job) {
        let pgres;

        if (!job.output) {
            job.output = {
                cache: false,
                output: false,
                preview: false,
                validated: false
            };
        }

        job.source_name = Job.fullname(job.source);
        job.version = pkg.version;

        return await super.generate(pool, job);
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
                return await trigger({
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
