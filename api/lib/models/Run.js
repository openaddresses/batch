import Modeler from '@openaddresses/batch-generic';
import Err from '@openaddresses/batch-error';
import { sql, eq, and, gt, lt, asc, desc, inArray } from 'drizzle-orm';
import moment from 'moment';
import { Run, Job } from '../schema.js';
import { explode, Status } from '../util.js';
import JobModel from './Job.js';
import DataModel from './Data.js';

/**
 * A Run is a collection of Jobs and associated metadata
 */
export default class RunModel extends Modeler {
    constructor(pool) {
        super(pool, Run);

        this.job = new JobModel(pool);
        this.data = new DataModel(pool);
    }

    /**
     * Anytime a job is completed, a ping is sent to the run module
     * to determine if the run is finished
     *
     * @param {CI} ci Instantiated CI instance
     * @param {Object} job job row that caused the run
     */
    async ping(ci, job) {
        try {
            const list = await this.list({
                run: job.run
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
                return !['Success', 'Fail'].includes(job.status);
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
     *
     * @param {Object} query - Query object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.run=false] - Only show run associated with a id (Normally use Run.from unless you need additional job information)
     * @param {String} [query.before=undefined] - Only show runs before the given date
     * @param {String} [query.after=undefined] - Only show jobs after the given date
     * @param {Number} [query.status=["Success", "Fail", "Running", "Pending", "Warn"]] - Only show runs with a given status
     * @param {Boolean} [query.count=true] - Compute the exact total match count (count(*) OVER()).
     *   Callers that only sweep pages sequentially (eg cleanup.js) don't use `total` and can set this
     *   to false to skip the extra work of computing an exact count on every page.
     * @param {Number} [query.cursor=undefined] - If set, keyset-paginate: only return runs with
     *   `id > cursor`, ordered by id ascending (overriding `sort`/`order`/`page`). Cheaper than
     *   `page`/OFFSET for callers sweeping the full result set, and immune to OFFSET drift when
     *   rows are deleted between page fetches (as cleanup.js does).
     */
    async list(query = {}) {
        const limit = query.limit || 100;
        const page = query.page || 0;
        const withCount = query.count === undefined ? true : !!query.count;
        const cursor = query.cursor === undefined || query.cursor === null ? null : Number(query.cursor);
        const run = query.run ? Number(query.run) : null;
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
            id: Run.id,
            live: Run.live,
            created: Run.created,
            github: Run.github,
            closed: Run.closed,
            status: sql`ARRAY_AGG(${Job.status})`,
            jobs: sql`count(${Job.id})`
        };

        if (withCount) fields.count = sql`count(*) OVER()`;

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
                    cursor !== null ? gt(Run.id, cursor) : undefined
                ))
                .groupBy(Run.id, Run.live, Run.created, Run.github, Run.closed)
                .orderBy(order(this.key(sort)))
                .limit(limit)
                .offset(cursor !== null ? 0 : limit * page);
        } catch (err) {
            throw new Err(500, err, 'failed to fetch runs');
        }

        return {
            total: pgres.length && withCount ? parseInt(pgres[0].count) : pgres.length,
            items: pgres.map((run) => {
                delete run.count;

                run.jobs = Number(run.jobs);

                if (run.status.includes('Fail')) {
                    run.status = 'Fail';
                } else if (run.status.includes('Pending')) {
                    run.status = 'Pending';
                } else {
                    run.status = 'Success';
                }

                return run;
            })
        };
    }

    /**
     * Once a Run has been created, populate the Run with Jobs
     *
     * @param {Number} run_id Run ID of the job to populate
     * @param {Array} rawjobs Jobs to populate run with
     */
    async populate(run_id, rawjobs) {
        let jobs = [];

        const run = await this.from(run_id);
        if (run.closed) throw new Err(400, null, 'Run is already closed');

        for (const job of rawjobs) {
            if (!job) {
                throw new Err(400, null, 'job element cannot be null');
            } else if (
                typeof job === 'string'
                && !/https:\/\/github\.com\//.test(job)
                && !/https:\/\/raw\.githubusercontent\.com\//.test(job)
            ) {
                throw new Err(400, null, 'job must reference github.com');
            }

            if (job.source) {
                jobs.push(job);
            } else if (typeof job === 'string') {
                try {
                    jobs = jobs.concat(await explode(job));
                } catch (err) {
                    console.error(`not ok - skipping ${job} as invalid: ${err.message}`);
                }
            } else {
                throw new Err(400, null, 'job must be string or job object');
            }
        }

        const errors = [];
        for (let i = 0; i < jobs.length; i++) {
            try {
                jobs[i] = await this.job.generate({
                    run: run_id,
                    source: jobs[i].source,
                    layer: jobs[i].layer,
                    name: jobs[i].name,
                    license: jobs[i].license
                });

                await this.job.batch(jobs[i], run.github && run.github.check);
            } catch (err) {
                errors.push({
                    error: err.message,
                    run: run_id,
                    source: jobs[i].source,
                    layer: jobs[i].layer,
                    name: jobs[i].name
                });
            }
        }

        try {
            await this.commit(run_id, {
                closed: true
            });
        } catch (err) {
            throw new Err(500, err, 'failed to close run');
        }

        return {
            run: run_id,
            errors: errors,
            jobs: jobs.map((job) => {
                return job.id;
            })
        };
    }

    /**
     * Return all associated jobs for a given run
     *
     * @param {Number} run_id run id
     *
     * @returns {Promise} promise
     */
    async jobs(run_id) {
        try {
            const pgres = await this.pool.select()
                .from(Job)
                .where(eq(Job.run, run_id))
                .orderBy(asc(Job.id));

            return pgres.map((job) => JobModel.serialize(job));
        } catch (err) {
            throw new Err(500, err, 'failed to fetch jobs');
        }
    }

    async from_sha(sha) {
        try {
            return await this.from(sql`${Run.github}->>'sha' = ${sha}`);
        } catch (err) {
            if (err instanceof Err && err.status === 404) throw new Err(404, null, 'no run by that sha');
            throw new Err(500, err, 'failed to fetch run from sha');
        }
    }

    async stats(id) {
        try {
            const pgres = await this.pool.select({
                count: sql`count(*)`,
                status: Job.status
            })
                .from(Job)
                .where(eq(Job.run, id))
                .groupBy(Job.status);

            if (!pgres.length) {
                throw new Err(404, null, 'no run jobs by that id');
            }

            const res = {
                run: id,
                status: {
                    Warn: 0,
                    Success: 0,
                    Pending: 0,
                    Fail: 0
                }
            };

            for (const row of pgres) {
                res.status[row.status] = Number(row.count);
            }

            return res;
        } catch (err) {
            throw new Err(500, err, 'failed to fetch run');
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
