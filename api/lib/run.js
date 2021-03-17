'use strict';

const Err = require('./error');
const moment = require('moment');
const Job = require('./job');
const Data = require('./data');
const util = require('./util');
const { Status } = require('./util');

class Run {
    constructor() {
        this.id = false;
        this.created = false;
        this.github = {};
        this.live = false;
        this.closed = false;

        // Attributes which are allowed to be patched
        this.attrs = Object.keys(require('../schema/req.body.PatchRun.json').properties);
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
                return job.status === 'Pending';
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
     * @param {Number} [query.status=["Success", "Fail", "Pending", "Warn"]] - Only show runs with a given status
     */
    static async list(pool, query) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;
        if (!query.status) query.status = Status.list();

        const where = [];

        Status.verify(query.status);

        if (!query.run) {
            query.run = false;
        } else {
            query.run = parseInt(query.run);
            if (isNaN(query.run)) {
                throw new Err(400, null, 'run param must be integer');
            }

            where.push(`run = ${query.run}`);
        }

        if (query.after) {
            try {
                const after = moment(query.after);
                where.push(`run.created > '${after.toDate().toISOString()}'::TIMESTAMP`);
            } catch (err) {
                throw new Err(400, null, 'after param is not recognized as a valid date');
            }
        }

        if (query.before) {
            try {
                const before = moment(query.before);
                where.push(`run.created < '${before.toDate().toISOString()}'::TIMESTAMP`);
            } catch (err) {
                throw new Err(400, null, 'before param is not recognized as a valid date');
            }
        }

        let pgres;
        try {
            if (!where.length) {
                pgres = await pool.query(`
                    SELECT
                        runs.id,
                        runs.live,
                        runs.created,
                        runs.github,
                        runs.closed,
                        ARRAY_AGG(job.status) AS status,
                        COUNT(job.*) AS jobs
                    FROM
                        runs,
                        job
                    WHERE
                        '{${query.status.join(',')}}'::TEXT[] @> ARRAY[job.status]
                        AND job.run = runs.id
                    GROUP BY
                        runs.id,
                        runs.live,
                        runs.created,
                        runs.github,
                        runs.closed
                    ORDER BY
                        runs.id DESC
                    LIMIT $1
                `, [
                    query.limit
                ]);
            } else {
                pgres = await pool.query(`
                    SELECT
                        runs.id,
                        runs.live,
                        runs.created,
                        runs.github,
                        runs.closed,
                        ARRAY_AGG(job.status) AS status,
                        COUNT(job.*) AS jobs
                    FROM
                        runs,
                        job
                    WHERE
                        '{${query.status.join(',')}}'::TEXT[] @> ARRAY[job.status]
                        AND job.run = runs.id
                        AND ${where.join(' AND ')}
                    GROUP BY
                        runs.id,
                        runs.live,
                        runs.created,
                        runs.github,
                        runs.closed
                    ORDER BY
                        runs.id DESC
                    LIMIT $1
                `, [
                    query.limit
                ]);
            }

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
     * @returns {Promise} promise
     */
    static async jobs(pool, run_id) {
        try {
            const pgres = await pool.query(`
                SELECT
                    *
                FROM
                    job
                WHERE
                    job.run = $1
            `, [run_id]);

            return pgres.rows.map((job) => {
                job.id = parseInt(job.id);
                job.run = parseInt(job.run);
                job.size = parseInt(job.size);

                return job;
            });
        } catch (err) {
            throw new Err(500, err, 'failed to fetch jobs');
        }
    }

    static async from_sha(pool, sha) {
        try {
            const pgres = await pool.query(`
                SELECT
                    *
                FROM
                    runs
                WHERE
                    github->>'sha' = $1
            `, [sha]);

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

    static async from(pool, id) {
        try {
            const pgres = await pool.query(`
                SELECT
                    *
                FROM
                    runs
                WHERE
                    id = $1
            `, [id]);

            const run = new Run();

            if (!pgres.rows.length) {
                throw new Err(404, null, 'no run by that id');
            }

            for (const key of Object.keys(pgres.rows[0])) {
                run[key] = pgres.rows[0][key];
            }

            return run;
        } catch (err) {
            throw new Err(500, err, 'failed to fetch run');
        }
    }

    static async stats(pool, id) {
        try {
            const pgres = await pool.query(`
                SELECT
                    status,
                    count(*) AS count
                FROM
                    job
                WHERE
                    run = $1
                GROUP BY
                    status
            `, [id]);

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

    static close(pool, id) {
        return new Promise((resolve, reject) => {
            pool.query(`
                UPDATE
                    runs
                SET
                    closed = true
                WHERE
                    id = $1
            `, [id], (err) => {
                if (err) return reject(new Err(500, err, 'failed to close run'));

                return resolve(true);
            });
        });

    }

    json() {
        return {
            id: parseInt(this.id),
            live: this.live,
            created: this.created,
            github: this.github,
            closed: this.closed
        };
    }

    patch(patch) {
        for (const attr of this.attrs) {
            if (patch[attr] !== undefined) {
                this[attr] = patch[attr];
            }
        }
    }

    async commit(pool) {
        try {
            await pool.query(`
                UPDATE runs
                    SET
                        github = $1,
                        closed = $2
           `, [this.github, this.closed]);
        } catch (err) {
            throw new Err(500, err, 'failed to save run');
        }

        return this;
    }

    static generate(pool, params = {}) {
        if (params.live !== true) params.live = false;
        if (!params.github) params.github = {};

        return new Promise((resolve, reject) => {
            pool.query(`
                INSERT INTO runs (
                    created,
                    live,
                    github,
                    closed
                ) VALUES (
                    NOW(),
                    $1,
                    $2,
                    false
                ) RETURNING *
            `, [
                params.live,
                params.github
            ], (err, pgres) => {
                if (err) return reject(new Err(500, err, 'failed to generate run'));

                const run = new Run();

                pgres.rows[0].id = parseInt(pgres.rows[0].id);
                for (const key of Object.keys(pgres.rows[0])) {
                    run[key] = pgres.rows[0][key];
                }

                return resolve(run);
            });
        });
    }
}

module.exports = Run;
