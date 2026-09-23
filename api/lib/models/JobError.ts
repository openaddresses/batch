import Modeler, { type GenericTable } from '@openaddresses/batch-generic';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { PgInsertValue } from 'drizzle-orm/pg-core';
import Err from '@openaddresses/batch-error';
import { sql, eq, and, asc, desc, ilike, inArray } from 'drizzle-orm';
import type { SQLWrapper } from 'drizzle-orm';
import { JobError, Job } from '../schema.js';
import { Status } from '../util.js';
import JobModel from './Job.js';
import RunModel from './Run.js';
import type CI from '../ci.js';
import type { JobAugmented } from './Job.js';
import type {
    ErrorListQueryType,
    ErrorListResponseType,
    ErrorModerateBodyType,
    ErrorModerateResponseType,
    JobErrorResponseType,
} from '../types.js';

const SORT: Record<string, SQLWrapper> = {
    job: Job.id,
    status: Job.status,
    messages: sql`JSON_AGG(${JobError.message})`,
    source_name: Job.source_name,
    layer: Job.layer,
    name: Job.name,
};

export default class JobErrorModel extends Modeler<GenericTable> {
    job: JobModel;
    run: RunModel;

    constructor(pool: PostgresJsDatabase<Record<string, unknown>>) {
        super(pool, JobError);

        this.job = new JobModel(pool);
        this.run = new RunModel(pool);
    }

    async augmented_list(query: Partial<ErrorListQueryType> = {}): Promise<ErrorListResponseType> {
        const limit = query.limit || 100;
        const page = query.page || 0;
        const layer = !query.layer || query.layer === 'all' ? '' : query.layer;
        const statuses = query.status ? [query.status] : Status.list();
        Status.verify(statuses);

        const sort = query.sort || 'job';
        if (!SORT[sort]) throw new Err(400, null, 'Invalid sort param');
        const order = query.order === 'desc' ? desc : asc;

        let pgres;
        try {
            pgres = await this.pool.select({
                count: sql<string>`count(*) OVER()`,
                job: Job.id,
                status: Job.status,
                messages: sql<string[]>`JSON_AGG(${JobError.message})`,
                source_name: Job.source_name,
                layer: Job.layer,
                name: Job.name,
            })
                .from(JobError)
                .innerJoin(Job, eq(JobError.job, Job.id))
                .where(and(
                    inArray(Job.status, statuses),
                    ilike(Job.layer, `${layer}%`),
                    ilike(Job.source, `%${query.source || ''}%`),
                ))
                .groupBy(Job.id)
                .orderBy(order(SORT[sort]))
                .limit(limit)
                .offset(limit * page);
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Failed to list job_errors');
        }

        return {
            total: pgres.length ? parseInt(pgres[0].count) : 0,
            errors: pgres.map((row) => {
                return {
                    job: Number(row.job),
                    status: String(row.status),
                    messages: row.messages,
                    source_name: String(row.source_name),
                    layer: String(row.layer),
                    name: String(row.name),
                };
            }),
        };
    }

    async generate(values: PgInsertValue<GenericTable>): Promise<{ job: number; messages: string[] }>;
    async generate(values: PgInsertValue<GenericTable>[]): Promise<Array<{ job: number; messages: string[] }>>;
    async generate(
        values: PgInsertValue<GenericTable> | PgInsertValue<GenericTable>[],
    ): Promise<{ job: number; messages: string[] } | Array<{ job: number; messages: string[] }>> {
        if (Array.isArray(values)) {
            return Promise.all(values.map(v => this.generate(v)));
        }

        const row = await super.generate(values) as unknown as { job: number; message: string };

        return {
            job: row.job,
            messages: [row.message],
        };
    }

    async moderate(ci: CI, job_id: number, params: ErrorModerateBodyType): Promise<ErrorModerateResponseType> {
        if (!params.moderate) throw new Err(400, null, 'moderate key must be provided');
        if (!['confirm', 'reject'].includes(params.moderate)) throw new Err(400, null, 'moderate key must be "confirm" or "reject"');

        let job: JobAugmented = await this.job.from(job_id);

        if (job.status === 'Fail' && params.moderate === 'confirm') {
            // Jobs that fail are added to the list solely to notify a mod that they failed
            // They can not be forcibly marked as a pass as this would break the data page
            throw new Err(400, null, 'Failed jobs can only be suppressed');
        }

        if (params.moderate === 'confirm') {
            job = await this.job.commit(job.id, {
                status: 'Success',
            });
        } else if (params.moderate === 'reject') {
            if (job.status !== 'Fail') {
                job = await this.job.commit(job.id, {
                    status: 'Fail',
                });
            }
        }

        await this.delete(eq(JobError.job, job.id));

        this.run.ping(ci, job);

        return {
            job: job_id,
            moderate: params.moderate,
        };
    }

    async from(job_id: number): Promise<JobErrorResponseType> {
        let pgres;
        try {
            pgres = await this.pool.select({
                job: Job.id,
                status: Job.status,
                messages: sql<string[]>`JSON_AGG(${JobError.message})`,
                source_name: Job.source_name,
                layer: Job.layer,
                name: Job.name,
            })
                .from(JobError)
                .innerJoin(Job, eq(JobError.job, Job.id))
                .where(eq(JobError.job, job_id))
                .groupBy(Job.id);
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Failed to get job_error');
        }

        if (pgres.length === 0) {
            throw new Err(404, null, 'No job errors found');
        }

        const row = pgres[0];
        return {
            job: Number(row.job),
            status: row.status ?? undefined,
            messages: row.messages,
            source_name: row.source_name ?? undefined,
            layer: row.layer ?? undefined,
            name: row.name ?? undefined,
        };
    }
}
