import { fetch } from 'undici';
import Modeler, { type GenericTable } from '@openaddresses/batch-generic';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { InferSelectModel } from 'drizzle-orm';
import type { PgInsertValue } from 'drizzle-orm/pg-core';
import Err from '@openaddresses/batch-error';
import { sql, eq, and, gt, lt, asc, desc, ilike, inArray, notExists } from 'drizzle-orm';
import fs from 'fs';
import area from '@turf/area';
import difference from '@turf/difference';
import CloudWatchLogs from '@aws-sdk/client-cloudwatch-logs';
import { stringify } from 'csv-stringify/sync';
import { Job, Run, Data } from '../schema.js';
import { Status } from '../util.js';
import { trigger } from '../batch.js';
import moment from 'moment';
import type { Polygon } from 'geojson';
import type { ListJobsQueryType, ListOrphanedJobsQueryType, SingleLogResponseType } from '../types.js';

const cwl = new CloudWatchLogs.CloudWatchLogsClient({ region: process.env.AWS_DEFAULT_REGION });
const pkg: { version: string } = JSON.parse(String(fs.readFileSync(new URL('../../package.json', import.meta.url))));

export type JobRow = InferSelectModel<typeof Job>;

export interface JobAugmented {
    id: number;
    license?: string | boolean | Record<string, unknown> | null;
    bounds?: { bbox?: unknown; [k: string]: unknown } | null;
    output?: { output?: boolean; validated?: boolean; pmtiles?: boolean; [k: string]: unknown } | null;
    s3?: string | boolean;
    s3_validated?: string | boolean;
    pmtiles_url?: string | null;
    source?: string;
    source_name?: string;
    layer?: string;
    name?: string;
    version?: string;
    status?: string;
    run?: number | null;
    map?: number | null;
    count?: number | null;
    stats?: Record<string, unknown> | null;
    loglink?: string | null;
    [k: string]: unknown;
}

export default class JobModel extends Modeler<GenericTable> {
    constructor(pool: PostgresJsDatabase<Record<string, unknown>>) {
        super(pool, Job);
    }

    /**
     * Return the source_name of the source given the source url
     */
    static fullname(source: string): string {
        return source
            .replace(/.*sources\//, '')
            .replace(/\.json/, '');
    }

    /**
     * Fetch the raw source JSON for a job from GitHub
     */
    static async raw(job: { source?: string }): Promise<Record<string, unknown>> {
        const res = await fetch(String(job.source));

        if (!res.ok) throw new Err(400, null, 'Failed to fetch source');

        return await res.json() as Record<string, unknown>;
    }

    /**
     * Parse the stored license & attach derived S3/PMTiles locations
     */
    static serialize(job: JobAugmented): JobAugmented {
        if (job.license) {
            try {
                job.license = JSON.parse(String(job.license));
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

    async from(id: number): Promise<JobAugmented> {
        return JobModel.serialize(await super.from(id) as unknown as JobAugmented);
    }

    async commit(id: number, values: Record<string, unknown> = {}): Promise<JobAugmented> {
        if (values.license && typeof values.license === 'object') {
            values.license = JSON.stringify(values.license);
        }

        return JobModel.serialize(await super.commit(id, values) as unknown as JobAugmented);
    }

    async generate(job: PgInsertValue<GenericTable>): Promise<JobAugmented>;
    async generate(job: PgInsertValue<GenericTable>[]): Promise<JobAugmented[]>;
    async generate(job: PgInsertValue<GenericTable> | PgInsertValue<GenericTable>[]): Promise<JobAugmented | JobAugmented[]> {
        if (Array.isArray(job)) {
            return Promise.all(job.map(j => this.generate(j)));
        }

        const values = job as Record<string, unknown>;

        if (!values.output) {
            values.output = {
                cache: false,
                output: false,
                preview: false,
                validated: false,
            };
        }

        if (values.license === undefined || values.license === null) {
            delete values.license;
        } else if (typeof values.license === 'object') {
            values.license = JSON.stringify(values.license);
        }

        values.source_name = JobModel.fullname(String(values.source));
        values.version = pkg.version;

        return JobModel.serialize(await super.generate(values) as unknown as JobAugmented);
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
    async list(query: Partial<ListJobsQueryType> = {}) {
        const limit = query.limit || 100;
        const page = query.page || 0;
        const withCount = query.count === undefined ? true : !!query.count;
        const cursor = query.cursor === undefined || query.cursor === null ? null : Number(query.cursor);
        const run = query.run ? Number(query.run) : null;
        const layer = !query.layer || query.layer === 'all' ? '' : query.layer;
        const statuses = query.status ? [query.status] : Status.list();
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
            size: Job.size,
            ...(withCount ? { count: sql<string>`count(*) OVER()` } : {}),
        };

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
                    cursor !== null ? gt(Job.id, cursor) : undefined,
                ))
                .orderBy(order(this.key(sort)))
                .limit(limit)
                .offset(cursor !== null ? 0 : limit * page);
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Failed to load jobs');
        }

        return {
            total: pgres.length && withCount ? parseInt((pgres[0] as { count?: string }).count ?? '0') : pgres.length,
            items: pgres.map((job) => {
                const { count, ...rest } = job as Record<string, unknown>;
                void count;
                return JobModel.serialize(rest as unknown as JobAugmented);
            }),
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
    async orphaned(query: Partial<ListOrphanedJobsQueryType> = {}) {
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
            count: Job.count,
            ...(withCount ? { total: sql<string>`count(*) OVER()` } : {}),
        };

        let pgres;
        try {
            pgres = await this.pool.select(fields)
                .from(Job)
                .where(and(
                    lt(Job.created, before as Date),
                    cursor !== null ? gt(Job.id, cursor) : undefined,
                    notExists(
                        this.pool.select({ id: Data.id }).from(Data).where(and(
                            eq(Data.source, Job.source_name),
                            eq(Data.layer, Job.layer),
                            eq(Data.name, Job.name),
                        )),
                    ),
                ))
                .orderBy(asc(Job.id))
                .limit(limit)
                .offset(cursor !== null ? 0 : limit * page);
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Failed to load orphaned jobs');
        }

        return {
            total: pgres.length && withCount ? parseInt((pgres[0] as { total?: string }).total ?? '0') : pgres.length,
            items: pgres.map((job) => {
                const { total, ...rest } = job as Record<string, unknown>;
                void total;
                return rest;
            }),
        };
    }

    /**
     * Return a comparison of a given job id and the current live data job
     *
     * @param {Number} compare_id - Id of the job to comapre against live job
     *
     * @returns {Object} Delta comparison
     */
    async delta(compare_id: number) {
        const compare = await this.from(compare_id);
        if (compare.status !== 'Success') throw new Err(400, null, 'Job is not in Success state');

        const datas = await this.pool.select({ job: Data.job })
            .from(Data)
            .where(and(
                eq(Data.source, String(compare.source_name)),
                eq(Data.layer, String(compare.layer)),
                eq(Data.name, String(compare.name)),
            ));

        let master: JobAugmented;
        if (datas.length > 1) {
            throw new Err(400, null, 'Job matches multiple live jobs');
        } else if (datas.length === 0) {
            throw new Err(400, null, 'Job does not match a live job');
        } else {
            master = await this.from(Number(datas[0].job));
        }

        type StatValue = number | Record<string, number>;
        const cstats = (compare.stats ?? {}) as Record<string, StatValue>;
        const mstats = (master.stats ?? {}) as Record<string, StatValue>;
        const stats: Record<string, StatValue> = JSON.parse(JSON.stringify(cstats));
        for (const key of Object.keys(cstats)) {
            const cval = cstats[key];
            if (typeof cval === 'object') {
                const sub = stats[key] as Record<string, number>;
                const msub = (typeof mstats[key] === 'object' ? mstats[key] : {}) as Record<string, number>;
                for (const key_i of Object.keys(cval)) {
                    sub[key_i] = cval[key_i] - (msub[key_i] !== undefined ? msub[key_i] : 0);
                }
            } else {
                const mval = mstats[key];
                stats[key] = cval - (typeof mval === 'number' ? mval : 0);
            }
        }

        const compareBounds = compare.bounds as unknown as Polygon;
        const masterBounds = master.bounds as unknown as Polygon;
        const geom = difference(masterBounds, compareBounds);
        const ccount = Number(compare.count ?? 0);
        const mcount = Number(master.count ?? 0);
        return {
            compare: {
                id: compare.id,
                count: ccount,
                stats: compare.stats,
                bounds: {
                    area: area(compareBounds),
                    geom: compare.bounds,
                },
            },
            master: {
                id: master.id,
                count: mcount,
                stats: master.stats,
                bounds: {
                    area: area(masterBounds),
                    geom: master.bounds,
                },
            },
            delta: {
                count: mcount - ccount,
                stats: stats,
                bounds: {
                    area: area(masterBounds) - area(compareBounds),
                    diff_area: geom ? geom : 0,
                    geom: geom,
                },
            },
        };
    }

    /**
     * Retrieve the CloudWatch log for a job
     */
    async log(job: JobAugmented, format = 'json'): Promise<SingleLogResponseType | string> {
        if (!job.loglink) throw new Err(404, null, 'Job has not produced a log');

        let rawEvents: Array<{ timestamp?: number; message?: string }> = [];

        try {
            const res = await cwl.send(new CloudWatchLogs.GetLogEventsCommand({
                logGroupName: '/aws/batch/job',
                logStreamName: String(job.loglink),
                startFromHead: true,
            }));

            rawEvents = res.events ?? [];
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Could not retrieve logs');
        }

        let line = 0;
        const events: SingleLogResponseType = rawEvents.map((event) => {
            return {
                id: ++line,
                timestamp: event.timestamp ?? 0,
                message: (event.message ?? '')
                    .replace(/access_token=[ps]k\.[A-Za-z0-9.-]+/, '<REDACTED>'),
            };
        });

        if (format === 'json') {
            return events;
        } else if (format === 'csv') {
            return stringify(events.map(e => [e.id, e.timestamp, e.message]), {
                delimiter: ',',
            });
        } else {
            throw new Err(400, null, 'Unsupported Format');
        }
    }

    /**
     * Submit the Job to AWS Batch for processing
     */
    async batch(job: JobAugmented, ci?: boolean | number | null): Promise<boolean> {
        if (!job.id) throw new Err(400, null, 'Cannot batch a job without an ID');

        if (process.env.StackName === 'test') {
            return true;
        } else {
            try {
                await trigger({
                    type: ci ? 'job-ci' : 'job',
                    job: job.id,
                    source: job.source,
                    layer: job.layer,
                    name: job.name,
                });

                return true;
            } catch (err) {
                throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'failed to submit job to batch');
            }
        }
    }
}

function parseLive(live: boolean | string | undefined): boolean | null {
    if (live === true || live === 'true') return true;
    if (live === false || live === 'false') return false;
    return null;
}

function parseDate(value: string | undefined, name: string): Date | null {
    if (!value) return null;

    const date = moment(value);
    if (!date.isValid()) throw new Err(400, null, `${name} param is not recognized as a valid date`);

    return date.toDate();
}
