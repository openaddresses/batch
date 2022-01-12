'use strict';
const { Err } = require('@openaddresses/batch-schema');
const Generic = require('@openaddresses/batch-generic');
const moment = require('moment');
const Job = require('./job');
const Data = require('./data');
const util = require('./util');
const { Status } = require('./util');
const { sql } = require('slonik');

class Run extends Generic {
    static _table = 'runs';
    static _patch = require('../schema/req.body.PatchRun.json');
    static _res = require('../schema/res.Run.json');

    constructor() {
        super();
    }

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
            const runs = await Run.list(pool, {
                run: job.run
            });

            if (runs.length !== 1) {
                throw new Error('Run#ping should always produce a single run');
            }

            const run = runs[0];

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
        if (!query.limit) query.limit = 100;
        if (!query.status) query.status = Status.list();

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
                    runs.id,
                    runs.live,
                    runs.created,
                    runs.github,
                    runs.closed,
                    ARRAY_AGG(job.status) AS status,
                    COUNT(job.*) AS jobs
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
                    runs.id DESC
                LIMIT
                    ${query.limit}
            `);

            return pgres.rows.map((run) => {
                run.id = parseInt(run.id);
                run.jobs = parseInt(run.jobs);

                if (run.status.includes('Fail')) {
                    run.status = 'Fail';
                } else if (run.status.includes('Pending')) {
                    run.status = 'Pending';
                } else {
                    run.status = 'Success';
                }

                return run;
            });
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
                    jobs = jobs.concat(await util.explode(job));
                } catch (err) {
                    console.error(`not ok - skipping ${job} as invalid: ${err.message}`);
                }
            } else {
                throw new Err(400, null, 'job must be string or job object');
            }
        }

        for (let i = 0; i < jobs.length; i++) {
            jobs[i] = new Job(run_id, jobs[i].source, jobs[i].layer, jobs[i].name);

            try {
                await jobs[i].generate(pool);
                await jobs[i].batch(run.github && run.github.check);
            } catch (err) {
                // TODO return list of successful ids
                throw new Err(400, err, 'jobs only partially queued');
            }
        }

        try {
            await Run.close(pool, run_id);
        } catch (err) {
            throw new Err(500, err, 'failed to close run');
        }

        return {
            run: run_id,
            jobs: jobs.map((job) => {
                return job.json().id;
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

            return pgres.rows.map((job) => {
                job.id = parseInt(job.id);
                job.run = parseInt(job.run);
                job.map = job.map ? parseInt(job.map) : null;
                job.count = isNaN(parseInt(job.count)) ? null : parseInt(job.count);
                job.size = parseInt(job.size);

                return Job.from_json(job);
            });
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

            const run = new Run();

            if (!pgres.rows.length) {
                throw new Err(404, null, 'no run by that sha');
            }

            for (const key of Object.keys(pgres.rows[0])) {
                run[key] = pgres.rows[0][key];
            }

            return run;
        } catch (err) {
            throw new Err(500, err, 'failed to fetch run from sha');
        }
    }

    static async stats(pool, id) {
        try {
            const pgres = await pool.query(sql`
                SELECT
                    status,
                    count(*) AS count
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
                res.status[row.status] = parseInt(row.count);
            }

            return res;
        } catch (err) {
            throw new Err(500, err, 'failed to fetch run');
        }
    }

    static async close(pool, id) {
        try {
            await pool.query(sql`
                UPDATE
                    runs
                SET
                    closed = true
                WHERE
                    id = ${id}
            `);

            return true;
        } catch (err) {
            throw new Err(500, err, 'failed to close run');
        }
    }

    async commit(pool) {
        try {
            await pool.query(sql`
                UPDATE runs
                    SET
                        github = ${this.github ? JSON.stringify(this.github) : null},
                        closed = ${this.closed},
                        live = ${this.live}
                    WHERE
                        id = ${this.id}
           `);
        } catch (err) {
            throw new Err(500, err, 'failed to save run');
        }

        return this;
    }

    static async generate(pool, params = {}) {
        if (params.live !== true) params.live = false;
        if (!params.github) params.github = {};

        let pgres;
        try {
            pgres = await pool.query(sql`
                INSERT INTO runs (
                    created,
                    live,
                    github,
                    closed
                ) VALUES (
                    NOW(),
                    ${params.live},
                    ${JSON.stringify(params.github)}::JSONB,
                    false
                ) RETURNING *
            `);
        } catch (err) {
            throw new Err(500, err, 'failed to generate run');
        }

        const run = new Run();

        pgres.rows[0].id = parseInt(pgres.rows[0].id);
        for (const key of Object.keys(pgres.rows[0])) {
            run[key] = pgres.rows[0][key];
        }

        return run;
    }
}

module.exports = Run;
