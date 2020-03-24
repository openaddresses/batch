'use strict';

const Err = require('./error');

class Run {
    constructor() {
        this.id = false;
        this.created = false;
        this.github = {};
        this.closed = false;

        // Attributes which are allowed to be patched
        this.attrs = ['github', 'closed', 'live'];
    }

    static list(pool) {
        return new Promise((resolve, reject) => {
            pool.query(`
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
                    job.id = runs.id
                GROUP BY
                    runs.id,
                    runs.live,
                    runs.created,
                    runs.github,
                    runs.closed
                ORDER BY
                    created DESC
                LIMIT 100
            `, (err, pgres) => {
                if (err) throw err;

                resolve(pgres.rows.map((run) => {
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
                }));
            });
        });
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

    static from(pool, id) {
        return new Promise((resolve, reject) => {
            pool.query(`
                SELECT
                    *
                FROM
                    runs
                WHERE
                    id = $1
            `, [id], (err, pgres) => {
                if (err) return reject(new Err(500, err, 'failed to fetch run'));

                const run = new Run();

                for (const key of Object.keys(pgres.rows[0])) {
                    run[key] = pgres.rows[0][key];
                }

                return resolve(run);
            });
        });
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
                    '{}'::JSONB,
                    false
                ) RETURNING *
            `, [
                params.live
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
