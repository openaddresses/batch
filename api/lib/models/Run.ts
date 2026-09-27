import Modeler, { type GenericTable } from '@openaddresses/batch-generic';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import Err from '@openaddresses/batch-error';
import { sql, eq, and, gt, lt, asc, desc, inArray } from 'drizzle-orm';
import moment from 'moment';
import { Run, Job } from '../schema.js';
import { explode, Status } from '../util.js';
import type { ExplodedJob } from '../util.js';
import JobModel from './Job.js';
import type { JobAugmented } from './Job.js';
import DataModel from './Data.js';
import type CI from '../ci.js';
import type {
    ListRunsQueryType,
    RunResponseType,
    RunStatsResponseType,
    SingleJobsCreateResponseType,
} from '../types.js';

interface RunRow {
    id: number;
    live: boolean | null;
    created: Date | null;
    github: Record<string, unknown> | null;
    closed: boolean | null;
}

export interface RunListItem {
    id: number;
    live: boolean;
    created: string;
    github: RunResponseType['github'];
    closed: boolean;
    status: string;
    jobs: number;
    [k: string]: unknown;
}

interface RunListResult {
    total: number;
    items: RunListItem[];
}

/**
 * A Run is a collection of Jobs and associated metadata
 */
export default class RunModel extends Modeler<GenericTable> {
    job: JobModel;
    data: DataModel;

    constructor(pool: PostgresJsDatabase<Record<string, unknown>>) {
        super(pool, Run);

        this.job = new JobModel(pool);
        this.data = new DataModel(pool);
    }

    /**
     * Anytime a job is completed, a ping is sent to the run module
     * to determine if the run is finished
     */
    async ping(ci: CI, job: JobAugmented): Promise<boolean | undefined> {
        try {
            const list = await this.list({
                run: Number(job.run),
            });

            if (list.items.length !== 1) {
                throw new Error('Run#ping should always produce a single run');
            }

            const run = list.items[0];

            if (run.live && job.status === 'Success') {
                await this.data.update(job);
            }

            if (run.live) {
                return true; // If run is in live mode, the GH checks are done or not present
            } else if (!run.github || !run.github.check) {
                console.error(`ok - run ${run.id} has no github check`);
                return true;
            }

            const is_pending = !!(await this.jobs(run.id)).filter((job) => {
                return !['Success', 'Fail'].includes(String(job.status));
            }).length;

            if (!is_pending) {
                await ci.finish_check(run);
            }
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * List & Filter Runs
     */
    async list(query: Partial<ListRunsQueryType> = {}): Promise<RunListResult> {
        const limit = query.limit || 100;
        const page = query.page || 0;
        const withCount = query.count === undefined ? true : !!query.count;
        const cursor = query.cursor === undefined || query.cursor === null ? null : Number(query.cursor);
        const run = query.run ? Number(query.run) : null;
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
            id: Run.id,
            live: Run.live,
            created: Run.created,
            github: Run.github,
            closed: Run.closed,
            status: sql<string[]>`ARRAY_AGG(${Job.status})`,
            jobs: sql<string>`count(${Job.id})`,
            ...(withCount ? { count: sql<string>`count(*) OVER()` } : {}),
        };

        let pgres;
        try {
            pgres = await this.pool.select(fields)
                .from(Run)
                .leftJoin(Job, eq(Job.run, Run.id))
                .where(and(
                    inArray(Job.status, statuses),
                    run !== null ? eq(Run.id, run) : undefined,
                    after ? gt(Run.created, after) : undefined,
                    before ? lt(Run.created, before) : undefined,
                    live !== null ? eq(Run.live, live) : undefined,
                    cursor !== null ? gt(Run.id, cursor) : undefined,
                ))
                .groupBy(Run.id, Run.live, Run.created, Run.github, Run.closed)
                .orderBy(order(this.key(sort)))
                .limit(limit)
                .offset(cursor !== null ? 0 : limit * page);
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'failed to fetch runs');
        }

        return {
            total: pgres.length && withCount ? parseInt((pgres[0] as { count?: string }).count ?? '0') : pgres.length,
            items: pgres.map((row) => {
                const statusArr = (row.status ?? []) as string[];
                let status = 'Success';
                if (statusArr.includes('Fail')) {
                    status = 'Fail';
                } else if (statusArr.includes('Pending')) {
                    status = 'Pending';
                }

                return {
                    id: row.id,
                    live: !!row.live,
                    created: String(row.created),
                    github: (row.github ?? {}) as RunResponseType['github'],
                    closed: !!row.closed,
                    status,
                    jobs: Number(row.jobs),
                };
            }),
        };
    }

    /**
     * Once a Run has been created, populate the Run with Jobs
     */
    async populate(run_id: number, rawjobs: Array<string | ExplodedJob>): Promise<SingleJobsCreateResponseType> {
        let jobs: Array<ExplodedJob | JobAugmented> = [];

        const run = await this.from(run_id) as unknown as RunRow;
        if (run.closed) throw new Err(400, null, 'Run is already closed');

        for (const job of rawjobs) {
            if (!job) {
                throw new Err(400, null, 'job element cannot be null');
            } else if (typeof job === 'string') {
                if (
                    !/https:\/\/github\.com\//.test(job)
                    && !/https:\/\/raw\.githubusercontent\.com\//.test(job)
                ) {
                    throw new Err(400, null, 'job must reference github.com');
                }

                try {
                    jobs = jobs.concat(await explode(job));
                } catch (err) {
                    console.error(`not ok - skipping ${job} as invalid: ${err instanceof Error ? err.message : String(err)}`);
                }
            } else if (job.source) {
                jobs.push(job);
            } else {
                throw new Err(400, null, 'job must be string or job object');
            }
        }

        const errors: Array<Record<string, unknown>> = [];
        for (let i = 0; i < jobs.length; i++) {
            const current = jobs[i];
            try {
                jobs[i] = await this.job.generate({
                    run: run_id,
                    source: current.source,
                    layer: current.layer,
                    name: current.name,
                    license: (current as ExplodedJob).license,
                });

                await this.job.batch(jobs[i] as JobAugmented, (run.github?.check ?? null) as number | null);
            } catch (err) {
                errors.push({
                    error: err instanceof Error ? err.message : String(err),
                    run: run_id,
                    source: current.source,
                    layer: current.layer,
                    name: current.name,
                });
            }
        }

        try {
            await this.commit(run_id, {
                closed: true,
            });
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'failed to close run');
        }

        return {
            run: run_id,
            errors: errors,
            jobs: jobs.map((job) => {
                return Number((job as JobAugmented).id);
            }),
        };
    }

    /**
     * Return all associated jobs for a given run
     */
    async jobs(run_id: number): Promise<JobAugmented[]> {
        try {
            const pgres = await this.pool.select()
                .from(Job)
                .where(eq(Job.run, run_id))
                .orderBy(asc(Job.id));

            return pgres.map(job => JobModel.serialize(job as unknown as JobAugmented));
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'failed to fetch jobs');
        }
    }

    async from_sha(sha: string): Promise<RunRow> {
        try {
            return await this.from(sql`${Run.github}->>'sha' = ${sha}`) as unknown as RunRow;
        } catch (err) {
            if (err instanceof Err && err.status === 404) throw new Err(404, null, 'no run by that sha');
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'failed to fetch run from sha');
        }
    }

    async stats(id: number): Promise<RunStatsResponseType> {
        try {
            const pgres = await this.pool.select({
                count: sql<string>`count(*)`,
                status: Job.status,
            })
                .from(Job)
                .where(eq(Job.run, id))
                .groupBy(Job.status);

            if (!pgres.length) {
                throw new Err(404, null, 'no run jobs by that id');
            }

            const res: RunStatsResponseType = {
                run: id,
                status: {
                    Warn: 0,
                    Success: 0,
                    Pending: 0,
                    Fail: 0,
                },
            };

            for (const row of pgres) {
                if (row.status && row.status in res.status) {
                    res.status[row.status as keyof typeof res.status] = Number(row.count);
                }
            }

            return res;
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'failed to fetch run');
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
