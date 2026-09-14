import { fetch } from 'undici';
import Modeler from '@openaddresses/batch-generic';
import Err from '@openaddresses/batch-error';
import { sql, eq, and, gt, lt, asc, desc, ilike, inArray, notExists } from 'drizzle-orm';
import moment from 'moment';
import fs from 'fs';
import { difference, area } from '@turf/turf';
import CloudWatchLogs from '@aws-sdk/client-cloudwatch-logs';
import { stringify } from 'csv-stringify/sync';
import { Job, Run, Data } from '../schema.js';
import { Status } from '../util.js';
import { trigger } from '../batch.js';

const cwl = new CloudWatchLogs.CloudWatchLogsClient({ region: process.env.AWS_DEFAULT_REGION });
const pkg = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url)));

export default class JobModel extends Modeler {
    constructor(pool) {
        super(pool, Job);
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

    /**
     * Fetch the raw source JSON for a job from GitHub
     *
     * @param {Object} job Job row
     */
    static async raw(job) {
        const res = await fetch(job.source);

        if (!res.ok) throw new Err(400, null, 'Failed to fetch source');

        return await res.json();
    }

    /**
     * Parse the stored license & attach derived S3/PMTiles locations
     *
     * @param {Object} job Job row
     */
    static serialize(job) {
        if (job.license) {
            try {
                job.license = JSON.parse(job.license);
            } catch (err) {
                console.error(err);
                job.license = true;
            }
        } else if (job.license !== undefined) {
            job.license = false;
        }

        if (job.bounds && job.bounds.bbox) delete job.bounds.bbox;

        if (job.output && job.output.output) {
            job.s3 = `s3://${process.env.Bucket}/${process.env.StackName}/job/${job.id}/source.geojson.gz`;
        }

        if (job.output && job.output.validated) {
            job.s3_validated = `s3://${process.env.Bucket}/${process.env.StackName}/job/${job.id}/validated.geojson.gz`;
        }

        if (job.output && job.output.pmtiles) {
            job.pmtiles_url = `https://v2.openaddresses.io/${process.env.StackName}/job/${job.id}/source.pmtiles`;
        }

        return job;
    }

    async from(id) {
        return JobModel.serialize(await super.from(id));
    }

    async commit(id, values = {}) {
        if (values.license && typeof values.license === 'object') {
            values.license = JSON.stringify(values.license);
        }

        return JobModel.serialize(await super.commit(id, values));
    }

    async generate(job) {
        if (!job.output) {
            job.output = {
                cache: false,
                output: false,
                preview: false,
                validated: false
            };
        }

        if (job.license === undefined || job.license === null) {
            delete job.license;
        } else if (typeof job.license === 'object') {
            job.license = JSON.stringify(job.license);
        }

        job.source_name = JobModel.fullname(job.source);
        job.version = pkg.version;

        return JobModel.serialize(await super.generate(job));
    }

    /**
     * List & Filter Jobs
     *
     * @param {Object} query - Query object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.run=false] - Only show jobs associated with a given run
     * @param {String} [query.live=undefined] - Only show jobs that are part of live runs
     * @param {String} [query.before=undefined] - Only show jobs before the given date
     * @param {String} [query.after=undefined] - Only show jobs after the given date
     * @param {String} [query.source=Null] - Filter results by source
     * @param {String[]} [query.status=["Success", "Fail", "Pending", "Warn"]] - Only show jobs with given status
     * @param {Boolean} [query.count=true] - Compute the exact total match count (count(*) OVER()).
     *   Callers that only sweep pages sequentially (eg cleanup.js) don't use `total` and can set this to
     *   false to skip the extra work of computing an exact count on every page.
     * @param {Number} [query.cursor=undefined] - If set, keyset-paginate: only return jobs with
     *   `id > cursor`, ordered by id ascending (overriding `sort`/`order`/`page`). Cheaper than
     *   `page`/OFFSET for callers sweeping the full result set page by page, and - unlike OFFSET -
     *   isn't thrown off by rows being deleted between page fetches.
     */
    async list(query = {}) {
        const limit = query.limit || 100;
        const page = query.page || 0;
        const withCount = query.count === undefined ? true : !!query.count;
        const cursor = query.cursor === undefined || query.cursor === null ? null : Number(query.cursor);
        const run = query.run ? Number(query.run) : null;
        const layer = !query.layer || query.layer === 'all' ? '' : query.layer;
        const statuses = query.status || Status.list();
        Status.verify(statuses);

        const live = parseLive(query.live);
        const after = parseDate(query.after, 'after');
        const before = parseDate(query.before, 'before');

        // Keyset pagination overrides page-number/OFFSET pagination: always walks
        // id ascending so a cursor of "last id seen" is well defined.
        const sort = cursor !== null ? 'id' : (query.sort || 'id');
        const order = cursor !== null ? asc : (query.order === 'desc' ? desc : asc);

        const fields = {
            id: Job.id,
            run: Job.run,
            map: Job.map,
            created: Job.created,
            source: Job.source,
            source_name: Job.source_name,
            layer: Job.layer,
            name: Job.name,
            output: Job.output,
            loglink: Job.loglink,
            status: Job.status,
            size: Job.size
        };

        if (withCount) fields.count = sql`count(*) OVER()`;

        let pgres;
        try {
            pgres = await this.pool.select(fields)
                .from(Job)
                .innerJoin(Run, eq(Job.run, Run.id))
                .where(and(
                    inArray(Job.status, statuses),
                    ilike(Job.layer, `${layer}%`),
                    ilike(Job.source, `%${query.source || ''}%`),
                    run !== null ? eq(Job.run, run) : undefined,
                    after ? gt(Job.created, after) : undefined,
                    before ? lt(Job.created, before) : undefined,
                    live !== null ? eq(Run.live, live) : undefined,
                    cursor !== null ? gt(Job.id, cursor) : undefined
                ))
                .orderBy(order(this.key(sort)))
                .limit(limit)
                .offset(cursor !== null ? 0 : limit * page);
        } catch (err) {
            throw new Err(500, err, 'Failed to load jobs');
        }

        return {
            total: pgres.length && withCount ? parseInt(pgres[0].count) : pgres.length,
            items: pgres.map((job) => {
                delete job.count;
                return JobModel.serialize(job);
            })
        };
    }

    /**
     * Find jobs that have no matching entry in the results table
     *
     * @param {Object} query - Query object
     * @param {String} query.before - Only return orphaned jobs created before this date
     * @param {Number} [query.limit=100] - Max results per page
     * @param {Number} [query.page=0] - Page number
     * @param {Boolean} [query.count=true] - Compute the exact total match count (count(*) OVER()).
     *   Set to false to skip this when sweeping pages sequentially and `total` isn't used.
     * @param {Number} [query.cursor=undefined] - If set, keyset-paginate: only return jobs with
     *   `id > cursor` (overriding `page`/OFFSET). Cheaper for callers sweeping the full result set,
     *   and immune to OFFSET drift when rows are deleted between page fetches (as this endpoint's
     *   only caller, cleanup.js, does).
     */
    async orphaned(query = {}) {
        const limit = query.limit || 100;
        const page = query.page || 0;
        const withCount = query.count === undefined ? true : !!query.count;
        const cursor = query.cursor === undefined || query.cursor === null ? null : Number(query.cursor);

        if (!query.before) throw new Err(400, null, 'before parameter required');
        const before = parseDate(query.before, 'before');

        const fields = {
            id: Job.id,
            run: Job.run,
            created: Job.created,
            source_name: Job.source_name,
            layer: Job.layer,
            name: Job.name,
            output: Job.output,
            status: Job.status,
            size: Job.size,
            count: Job.count
        };

        if (withCount) fields.total = sql`count(*) OVER()`;

        let pgres;
        try {
            pgres = await this.pool.select(fields)
                .from(Job)
                .where(and(
                    lt(Job.created, before),
                    cursor !== null ? gt(Job.id, cursor) : undefined,
                    notExists(
                        this.pool.select({ id: Data.id }).from(Data).where(and(
                            eq(Data.source, Job.source_name),
                            eq(Data.layer, Job.layer),
                            eq(Data.name, Job.name)
                        ))
                    )
                ))
                .orderBy(asc(Job.id))
                .limit(limit)
                .offset(cursor !== null ? 0 : limit * page);
        } catch (err) {
            throw new Err(500, err, 'Failed to load orphaned jobs');
        }

        return {
            total: pgres.length && withCount ? parseInt(pgres[0].total) : pgres.length,
            items: pgres.map((job) => {
                delete job.total;
                return job;
            })
        };
    }

    /**
     * Return a comparison of a given job id and the current live data job
     *
     * @param {Number} compare_id - Id of the job to comapre against live job
     *
     * @returns {Object} Delta comparison
     */
    async delta(compare_id) {
        const compare = await this.from(compare_id);
        if (compare.status !== 'Success') throw new Err(400, null, 'Job is not in Success state');

        const datas = await this.pool.select({ job: Data.job })
            .from(Data)
            .where(and(
                eq(Data.source, compare.source_name),
                eq(Data.layer, compare.layer),
                eq(Data.name, compare.name)
            ));

        let master;
        if (datas.length > 1) {
            throw new Err(400, null, 'Job matches multiple live jobs');
        } else if (datas.length === 0) {
            throw new Err(400, null, 'Job does not match a live job');
        } else {
            master = await this.from(datas[0].job);
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
     * Retrieve the CloudWatch log for a job
     *
     * @param {Object} job Job row
     * @param {String} [format=json] json or csv
     */
    async log(job, format = 'json') {
        if (!job.loglink) throw new Err(404, null, 'Job has not produced a log');

        let events = [];

        try {
            const res = await cwl.send(new CloudWatchLogs.GetLogEventsCommand({
                logGroupName: '/aws/batch/job',
                logStreamName: job.loglink,
                startFromHead: true
            }));

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

    /**
     * Submit the Job to AWS Batch for processing
     *
     * @param {Object} job Job row
     * @param {Boolean} ci Should the job be submit to the CI queue (faster) or the default
     */
    async batch(job, ci) {
        if (!job.id) throw new Err(400, null, 'Cannot batch a job without an ID');

        if (process.env.StackName === 'test') {
            return true;
        } else {
            try {
                return await trigger({
                    type: ci ? 'job-ci' : 'job',
                    job: job.id,
                    source: job.source,
                    layer: job.layer,
                    name: job.name
                });
            } catch (err) {
                throw new Err(500, err, 'failed to submit job to batch');
            }
        }
    }
}

function parseLive(live) {
    if (live === true || live === 'true') return true;
    if (live === false || live === 'false') return false;
    return null;
}

function parseDate(value, name) {
    if (!value) return null;

    const date = moment(value);
    if (!date.isValid()) throw new Err(400, null, `${name} param is not recognized as a valid date`);

    return date.toDate();
}
