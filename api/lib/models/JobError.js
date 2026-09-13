import Modeler from '@openaddresses/batch-generic';
import Err from '@openaddresses/batch-error';
import { sql, eq, and, asc, desc, ilike, inArray } from 'drizzle-orm';
import { JobError, Job } from '../schema.js';
import { Status } from '../util.js';
import JobModel from './Job.js';
import RunModel from './Run.js';

const SORT = {
    job: Job.id,
    status: Job.status,
    messages: sql`JSON_AGG(${JobError.message})`,
    source_name: Job.source_name,
    layer: Job.layer,
    name: Job.name
};

export default class JobErrorModel extends Modeler {
    constructor(pool) {
        super(pool, JobError);

        this.job = new JobModel(pool);
        this.run = new RunModel(pool);
    }

    async list(query = {}) {
        const limit = query.limit || 100;
        const page = query.page || 0;
        const layer = !query.layer || query.layer === 'all' ? '' : query.layer;
        const statuses = query.status || Status.list();
        Status.verify(statuses);

        const sort = query.sort || 'job';
        if (!SORT[sort]) throw new Err(400, null, 'Invalid sort param');
        const order = query.order === 'desc' ? desc : asc;

        let pgres;
        try {
            pgres = await this.pool.select({
                count: sql`count(*) OVER()`,
                job: Job.id,
                status: Job.status,
                messages: sql`JSON_AGG(${JobError.message})`,
                source_name: Job.source_name,
                layer: Job.layer,
                name: Job.name
            })
                .from(JobError)
                .innerJoin(Job, eq(JobError.job, Job.id))
                .where(and(
                    inArray(Job.status, statuses),
                    ilike(Job.layer, `${layer}%`),
                    ilike(Job.source, `%${query.source || ''}%`)
                ))
                .groupBy(Job.id)
                .orderBy(order(SORT[sort]))
                .limit(limit)
                .offset(limit * page);
        } catch (err) {
            throw new Err(500, err, 'Failed to list job_errors');
        }

        return {
            total: pgres.length ? parseInt(pgres[0].count) : 0,
            items: pgres.map((row) => {
                delete row.count;
                return row;
            })
        };
    }

    async generate(values) {
        const row = await super.generate(values);

        return {
            job: row.job,
            messages: [row.message]
        };
    }

    async moderate(ci, job_id, params) {
        if (!params.moderate) throw new Err(400, null, 'moderate key must be provided');
        if (!['confirm', 'reject'].includes(params.moderate)) throw new Err(400, null, 'moderate key must be "confirm" or "reject"');

        let job = await this.job.from(job_id);

        if (job.status === 'Fail' && params.moderate === 'confirm') {
            // Jobs that fail are added to the list solely to notify a mod that they failed
            // They can not be forcibly marked as a pass as this would break the data page
            throw new Err(400, null, 'Failed jobs can only be suppressed');
        }

        if (params.moderate === 'confirm') {
            job = await this.job.commit(job.id, {
                status: 'Success'
            });
        } else if (params.moderate === 'reject') {
            if (job.status !== 'Fail') {
                job = await this.job.commit(job.id, {
                    status: 'Fail'
                });
            }
        }

        await this.delete(eq(JobError.job, job.id));

        this.run.ping(ci, job);

        return {
            job: job_id,
            moderate: params.moderate
        };
    }

    async from(job_id) {
        let pgres;
        try {
            pgres = await this.pool.select({
                job: Job.id,
                status: Job.status,
                messages: sql`JSON_AGG(${JobError.message})`,
                source_name: Job.source_name,
                layer: Job.layer,
                name: Job.name
            })
                .from(JobError)
                .innerJoin(Job, eq(JobError.job, Job.id))
                .where(eq(JobError.job, job_id))
                .groupBy(Job.id);
        } catch (err) {
            throw new Err(500, err, 'Failed to get job_error');
        }

        if (pgres.length === 0) {
            throw new Err(404, null, 'No job errors found');
        }

        return pgres[0];
    }
}
