import Err from '@openaddresses/batch-error';
import Job from './job.js';
import Run from './run.js';
import fs from 'fs';
import { sql } from 'slonik';
import { Status } from '../util.js';
import Generic from '@openaddresses/batch-generic';

/**
 * @class
 */
export default class JobError extends Generic {
    static _table = 'job_errors';

    static async list(pool, query) {
        if (!query) query = {};
        if (!query.source) query.source = '';
        if (!query.layer || query.layer === 'all') query.layer = '';
        if (!query.status) query.status = Status.list();

        query.source = '%' + query.source + '%';
        query.layer = query.layer + '%';

        Status.verify(query.status);

        let pgres;
        try {
            pgres = await pool.query(sql`
                SELECT
                    job.id AS job,
                    job.status,
                    JSON_AGG(job_errors.message) AS messages,
                    job.source_name,
                    job.layer,
                    job.name
                FROM
                    job_errors INNER JOIN job
                        ON job_errors.job = job.id
                WHERE
                    ${sql.array(query.status, sql`TEXT[]`)} @> ARRAY[job.status]
                    AND job.layer ilike ${query.layer}
                    AND job.source ilike ${query.source}
                GROUP BY
                    job.id
                ORDER BY
                    job.created DESC
            `);
        } catch (err) {
            throw new Err(500, err, 'Failed to list job_errors');
        }

        if (pgres.rows.length === 0) {
            throw new Err(404, null, 'No job errors found');
        }

        return JobError.deserialize_list(pgres).job_errors;
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
            await job.commit({
                status: 'Success'
            });
        } else if (params.moderate === 'reject') {
            if (job.status !== 'Fail') {
                await job.commit({
                    status: 'Fail'
                });
            }
        }

        await JobError.delete(pool, job.id, {
            column: 'job'
        });

        Run.ping(pool, ci, job);

        return {
            job: job_id,
            moderate: params.moderate
        };
    }

    static async from(pool, job_id) {
        let pgres;
        try {
            pgres = await pool.query(sql`
                SELECT
                    job.id AS job,
                    job.status,
                    JSON_AGG(job_errors.message) AS messages,
                    job.source_name,
                    job.layer,
                    job.name
                FROM
                    job_errors INNER JOIN job
                        ON job_errors.job = job.id
                WHERE
                    job_errors.job = ${job_id}
                GROUP BY
                    job.id
            `);
        } catch (err) {
            throw new Err(500, err, 'Failed to get job_error');
        }

        if (pgres.rows.length === 0) {
            throw new Err(404, null, 'No job errors found');
        }

        return this.deserialize(pool, pgres);
    }

    static async count(pool) {
        let pgres;
        try {
            pgres = await pool.query(sql`
                SELECT
                    count(*) AS count
                FROM
                    job_errors
            `);
        } catch (err) {
            throw new Err(500, err, 'Failed to count job_errors');
        }

        return {
            count: pgres.rows[0].count
        };
    }
}
