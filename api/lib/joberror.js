'use strict';

const Err = require('./error');

/**
 * @class JobError
 */
class JobError {
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
                ORDRE BY
                    job.created DESC
            `);
        } catch (err) {
            throw new Err(500, err, 'Failed to list job_errors');
        }

        if (pgres.rows.length === 0) {
            throw new Err(404, null, 'No job errors found');
        }
    }
}

module.exports = JobError;
