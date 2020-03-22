'use strict';

const Err = require('./error');

class Run {
    constructor() {
        this.id = false;
        this.created = false;
        this.github = {};
        this.closed = false;

        // Attributes which are allowed to be patched
        this.attrs = ['github', 'closed'];
    }

    static list(pool) {
        return new Promise((resolve, reject) => {
            pool.query(`
                SELECT
                    *
                FROM
                    runs
                ORDER BY
                    created DESC
                LIMIT 100
            `, (err, pgres) => {
                if (err) throw err;

                res.json(pgres.rows.map((run) => {
                    run.id = parseInt(run.id);

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
                    jobs
                WHERE
                    jobs.run = $1
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
        new Promise((resolve, reject) => {
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
        new Promise((resolve, reject) => {
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

    static generate(pool) {
        return new Promise((resolve, reject) => {
            pool.query(`
                INSERT INTO runs (
                    created,
                    github,
                    closed
                ) VALUES (
                    NOW(),
                    '{}'::JSONB,
                    false
                ) RETURNING *
            `, (err, pgres) => {
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
