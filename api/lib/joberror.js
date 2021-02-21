'use strict';

const Err = require('./error');
const Job = require('./job');
const Run = require('./run');

/**
 * @class JobError
 */
class JobError {
    constructor(job, message) {
        if (typeof job !== 'number') throw new Error('JobError.job must be numeric');
        if (typeof message !== 'string') throw new Error('JobError.message must be a string');

        this.job = job;
        this.message = message;
    }

    async generate(pool) {
        if (!this.job) throw new Err(400, null, 'Cannot generate a job error without a job');
        if (!this.message) throw new Err(400, null, 'Cannot generate a job error without a message');

        try {
            await pool.query(`
                INSERT INTO job_errors (
                    job,
                    message
                ) VALUES (
                    $1,
                    $2
                ) RETURNING *
            `, [
                this.job,
                this.message
            ]);

            return  {
                job: this.job,
                message: this.message
            };
        } catch (err) {
            throw new Err(500, err, 'failed to generate job error');
        }
    }

    static async clear(pool) {
        try {
            await pool.query(`
                DELETE FROM
                    job_errors
            `);
        } catch (err) {
            throw new Err(500, err, 'failed to clear job_errors');
        }

        return true;
    }

    static async delete(pool, job_id) {
        try {
            await pool.query(`
                DELETE FROM
                    job_errors
                WHERE
                    job = $1
            `, [
                job_id
            ]);
        } catch (err) {
            throw new Err(500, err, 'failed to remove job from job_errors');
        }

        return {
            job: job_id
        };
    }

    static async moderate(pool, ci, job_id, params) {
        if (!params.moderate) throw new Err(400, null, 'moderate key must be provided');
        if (!['confirm', 'reject'].includes(params.moderate)) throw new Err(400, null, 'moderate key must be "confirm" or "reject"');

        const job = await Job.from(pool, job_id);

        if (job.status === 'Fail' && params.moderate === 'confirm') {
            // Jobs that fail are added to the list solely to notify a mod that they failed
            // They can not be forcibly marked as a pass as this would break the data page
            throw new Err(400, null, 'Failed jobs can only be suppressed');
        }

        if (params.moderate === 'confirm') {
            job.status = 'Success';
            await job.commit(pool);
        } else if (params.moderate === 'reject') {
            if (job.status !== 'Fail') {
                job.status = 'Fail';
                await job.commit(pool);
            }
        }

        await JobError.delete(pool, job_id);
        Run.ping(pool, ci, job);

        return {
            job: job_id,
            moderate: params.moderate
        };
    }

    static async list(pool) {
        let pgres;
        try {
            pgres = await pool.query(`
                SELECT
                    job.id,
                    job.status,
                    job_errors.message,
                    job.source_name,
                    job.layer,
                    job.name
                FROM
                    job_errors INNER JOIN job
                        ON job_errors.job = job.id
                ORDER BY
                    job.created DESC
            `);
        } catch (err) {
            throw new Err(500, err, 'Failed to list job_errors');
        }

        if (pgres.rows.length === 0) {
            throw new Err(404, null, 'No job errors found');
        }

        return pgres.rows.map((row) => {
            row.id = parseInt(row.id);

            return row;
        });
    }

    static async get(pool, job_id) {
        let pgres;
        try {
            pgres = await pool.query(`
                SELECT
                    job.id,
                    job.status,
                    job_errors.message,
                    job.source_name,
                    job.layer,
                    job.name
                FROM
                    job_errors INNER JOIN job
                        ON job_errors.job = job.id
                WHERE
                    job_errors.job = $1
            `, [job_id]);
        } catch (err) {
            throw new Err(500, err, 'Failed to get job_error');
        }

        if (pgres.rows.length === 0) {
            throw new Err(404, null, 'No job errors found');
        }

        const row = pgres.rows[0];
        return {
            id: parseInt(row.id),
            status: row.status,
            message: row.message,
            source_name: row.source_name,
            layer: row.layer,
            name: row.name
        };
    }

    static async count(pool) {
        let pgres;
        try {
            pgres = await pool.query(`
                SELECT
                    count(*) AS count
                FROM
                    job_errors
            `);
        } catch (err) {
            throw new Err(500, err, 'Failed to count job_errors');
        }

        return {
            count: parseInt(pgres.rows[0].count)
        };
    }
}

module.exports = JobError;
