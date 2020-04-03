'use strict';

const Err = require('./error');
const Job = require('./job');
const util = require('./util');

class Run {
    constructor() {
        this.id = false;
        this.created = false;
        this.github = {};
        this.closed = false;

        // Attributes which are allowed to be patched
        this.attrs = ['github', 'closed', 'live'];
    }

    /**
     * Anytime a job is completed, a ping is sent to the run module
     * to determine if the run is finished
     *
     * @param {Pool} pool Postgres Pool instance
     * @param {CI} ci Instantiated CI instance
     * @param {Number} runid ID of run to update
     */
    static async ping(pool, ci, runid) {
        try {
            const runs = await Run.list(pool, {
                run: runid
            });

            if (runs.length !== 1) {
                throw new Error('Run#ping should always produce a single run');
            }

            if (runs[0].status === 'Success' || runs[0].status === 'Fail') {
                await ci.check(runs[0]);
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
     */
    static async list(pool, query) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;

        const where = [];

        if (!query.run) {
            query.run = false;
        } else {
            query.run = parseInt(query.run);
            if (isNaN(query.run)) {
                throw new Err(400, null, 'run param must be integer');
            }

            where.push(`run = ${query.run}`);
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
                        job.run = runs.id
                    GROUP BY
                        runs.id,
                        runs.live,
                        runs.created,
                        runs.github,
                        runs.closed
                    ORDER BY
                        created DESC
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
                        job.run = runs.id
                        AND ${where.join(' AND ')}
                    GROUP BY
                        runs.id,
                        runs.live,
                        runs.created,
                        runs.github,
                        runs.closed
                    ORDER BY
                        created DESC
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

    static async populate(pool, run_id, rawjobs) {
        let jobs = [];

        for (const job of rawjobs) {
            if (!job) {
                throw new Err(400, null, 'job element cannot be null');
            } else if (
                typeof job === 'string'
                && !/https:\/\/github\.com\//.test(job)
                && !/https:\/\/raw\.githubusercontent\.com\//.test(job)
            ) {
                throw new Err(400, null, 'job must reference github.com');
            } else if (job.source) {
                jobs.push(job);
            } else if (typeof job === 'string') {
                try {
                    try {
                        jobs = jobs.concat(await util.explode(job));
                    } catch (err) {
                        console.error(`not ok - skipping ${job} as invalid: ${err.message}`);
                    }
                } catch (err) {
                    throw new Err(400, err, 'Job is not valid');
                }
            } else {
                throw new Err(400, null, 'job must be string or job object');
            }

            for (let i = 0; i < jobs.length; i++) {
                jobs[i] = new Job(run_id, jobs[i].source, jobs[i].layer, jobs[i].name);

                try {
                    await jobs[i].generate(pool);
                    await jobs[i].batch();
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
    static jobs(pool, run_id) {
        return new Promise((resolve, reject) => {
            pool.query(`
                SELECT
                    *
                FROM
                    job
                WHERE
                    job.run = $1
            `, [run_id], (err, pgres) => {
                if (err) return reject(new Err(500, err, 'failed to fetch jobs'));

                return resolve(pgres.rows.map((job) => {
                    job.id = parseInt(job.id);
                    job.run = parseInt(job.run);

                    return job;
                }));
            });
        });
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

            for (const key of Object.keys(pgres.rows[0])) {
                run[key] = pgres.rows[0][key];
            }

            return run;
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

    commit(pool) {
        return new Promise((resolve, reject) => {
            pool.query(`
                UPDATE runs
                    SET
                        github = $1,
                        closed = $2
           `, [this.github, this.closed], (err) => {
                if (err) return reject(new Err(500, err, 'failed to save run'));

                return resolve(this);
            });
        });
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

                for (const key of Object.keys(pgres.rows[0])) {
                    run[key] = pgres.rows[0][key];
                }

                return resolve(run);
            });
        });
    }
}

module.exports = Run;
