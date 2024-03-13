import fs from 'fs';
import Err from '@openaddresses/batch-error';
import Generic, { Params } from '@openaddresses/batch-generic';
import moment from 'moment';
import Job from './job.js';
import Data from './data.js';
import { explode, Status } from '../util.js';
import { sql } from 'slonik';

/**
 * A Run is a collection of Jobs and associated metadata
 *
 * @class
 */
export default class Run extends Generic {
    static _table = 'runs';

    /**
     * Anytime a job is completed, a ping is sent to the run module
     * to determine if the run is finished
     *
     * @param {Pool} pool Postgres Pool instance
     * @param {CI} ci Instantiated CI instance
     * @param {Job} job job object that caused the run
     */
    static async ping(pool, ci, job) {
        try {
            const list = await Run.list(pool, {
                run: job.run
            });

            if (list.runs.length !== 1) {
                throw new Error('Run#ping should always produce a single run');
            }

            const run = list.runs[0];

            if (run.live && job.status === 'Success') {
                await Data.update(pool, job);
            }

            if (run.live) {
                return true; // If run is in live mode, the GH checks are done or not present
            } else if (!run.github || !run.github.check) {
                console.error(`ok - run ${run.id} has no github check`);
                return true;
            }

            const is_pending = !!(await Run.jobs(pool, run.id)).filter((job) => {
                return !['Success', 'Fail'].includes(job.status);
            }).length;

            if (!is_pending) {
                await ci.finish_check(pool, run);
            }
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * List & Filter Runs
     *
     * @param {Pool} pool - Postgres Pool instance
     * @param {Object} query - Query object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.run=false] - Only show run associated with a id (Normally use Run.from unless you need additional job information)
     * @param {String} [query.before=undefined] - Only show runs before the given date
     * @param {String} [query.after=undefined] - Only show jobs after the given date
     * @param {Number} [query.status=["Success", "Fail", "Running", "Pending", "Warn"]] - Only show runs with a given status
     */
    static async list(pool, query) {
        if (!query) query = {};
        if (!query.status) query.status = Status.list();

        query.page = Params.integer(query.page, { default: 0 });
        query.limit = Params.integer(query.limit, { default: 100 });
        query.sort = Params.string(query.sort, { default: 'id' });
        query.order = Params.order(query.order);

        if (!query.after) query.after = null;
        if (!query.before) query.before = null;

        Status.verify(query.status);

        if (!query.run) query.run = null;

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
                    count(*) OVER() AS count,
                    runs.id,
                    runs.live,
                    runs.created,
                    runs.github,
                    runs.closed,
                    ARRAY_AGG(job.status) AS status,
                    ARRAY_LENGTH(ARRAY_AGG(job.status), 0) AS jobs
                FROM
                    runs
                        LEFT JOIN job
                        ON job.run = runs.id
                WHERE
                    ${sql.array(query.status, sql`TEXT[]`)} @> ARRAY[job.status]
                    AND (${query.run}::BIGINT IS NULL OR run = ${query.run})
                    AND (${query.after}::TIMESTAMP IS NULL OR runs.created > ${query.after ? query.after.toDate().toISOString() : null}::TIMESTAMP)
                    AND (${query.before}::TIMESTAMP IS NULL OR runs.created < ${query.before ? query.before.toDate().toISOString() : null}::TIMESTAMP)
                GROUP BY
                    runs.id,
                    runs.live,
                    runs.created,
                    runs.github,
                    runs.closed
                ORDER BY
                    ${sql.identifier([this._table, query.sort])} ${query.order}
                LIMIT
                    ${query.limit}
                OFFSET
                    ${query.limit * query.page}
            `);

            const list = this.deserialize_list(pgres, 'runs');

            list.runs.map((run) => {
                if (run.status.includes('Fail')) {
                    run.status = 'Fail';
                } else if (run.status.includes('Pending')) {
                    run.status = 'Pending';
                } else {
                    run.status = 'Success';
                }

                return run;
            });

            return list;
        } catch (err) {
            throw new Err(500, err, 'failed to fetch runs');
        }
    }

    /**
     * Once a Run has been created, populate the Run with Jobs
     *
     * @param {Pool} pool Postgres Pool instance
     * @param {Number} run_id Run ID of the job to populate
     * @param {Array} rawjobs Jobs to populate run with
     */
    static async populate(pool, run_id, rawjobs) {
        let jobs = [];

        const run = await Run.from(pool, run_id);
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
                jobs[i] = await Job.generate(pool, {
                    run: run_id,
                    source: jobs[i].source,
                    layer: jobs[i].layer,
                    name: jobs[i].name
                });

                await jobs[i].batch(run.github && run.github.check);
            } catch (err) {
                errors.push({
                    error: err.message,
                    run: run_id,
                    source: jobs[i].source,
                    layer: jobs[i].layer,
                    name: jobs[i].name
                })
            }
        }

        try {
            await Run.commit(pool, run_id, {
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
     * @param {Object} pool Postgres Pool
     * @param {Number} run_id run id
     *
     * @returns {Promise} promise
     */
    static async jobs(pool, run_id) {
        try {
            const pgres = await pool.query(sql`
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
                    job.run = ${run_id}
            `);

            return pgres.rows;
        } catch (err) {
            throw new Err(500, err, 'failed to fetch jobs');
        }
    }

    static async from_sha(pool, sha) {
        try {
            const pgres = await pool.query(sql`
                SELECT
                    *
                FROM
                    runs
                WHERE
                    github->>'sha' = ${sha}
            `);

            if (!pgres.rows.length) {
                throw new Err(404, null, 'no run by that sha');
            }

            return this.deserialize(pool, pgres);
        } catch (err) {
            throw new Err(500, err, 'failed to fetch run from sha');
        }
    }

    static async stats(pool, id) {
        try {
            const pgres = await pool.query(sql`
                SELECT
                    count(*) AS count,
                    status
                FROM
                    job
                WHERE
                    run = ${id}
                GROUP BY
                    status
            `);

            if (!pgres.rows.length) {
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

            for (const row of pgres.rows) {
                res.status[row.status] = row.count;
            }

            return res;
        } catch (err) {
            throw new Err(500, err, 'failed to fetch run');
        }
    }
}
