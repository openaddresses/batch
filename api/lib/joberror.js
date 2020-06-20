'use strict';

const Err = require('./error');

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
            const pgres = await pool.query(`
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

    static async list(pool, query) {
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

        return pgres.rows;
    }
}

module.exports = JobError;
