'use strict';

const Err = require('./error');
const Bin = require('./bin');
const Job = require('./job');

/**
 * @class Data
 */
class Data {
    static async list(pool, query) {
        if (!query) query = {};

        if (!query.source) query.source = '';
        if (!query.layer || query.layer === 'all') query.layer = '';
        if (!query.name) query.name = '';

        query.source = '%' + query.source + '%';
        query.layer = query.layer + '%';
        query.name = query.name + '%';

        try {
            const pgres = await pool.query(`
                SELECT
                    results.source,
                    results.updated,
                    results.layer,
                    results.name,
                    results.job,
                    job.output
                FROM
                    results,
                    job
                WHERE
                    results.job = job.id
                    AND results.source ilike $1
                    AND results.layer ilike $2
                    AND results.name ilike $3
            `, [
                query.source,
                query.layer,
                query.name
            ]);

            return pgres.rows.map((res) => {
                res.job = parseInt(res.job);

                return res;
            });
        } catch (err) {
            throw new Err(500, err, 'Failed to load data');
        }
    }

    static async history(pool, job_id) {
        const job = await Job.from(pool, job_id);

        try {
            await pool.query(`
                SELECT
                    job.id,
                    job.created,
                    job.status,
                    job.run
                FROM
                    job,
                    runs
                WHERE
                    job.run = runs.id
                    AND runs.live = true
                    AND job.source_name = $1
                    AND job.layer = $2
                    AND job.name = $3
            `, [
                job.source_name,
                job.layer,
                job.name
            ]);
        } catch (err) {
            throw new Err(500, err, 'Failed to get data history');
        }
    }

    static async update(pool, job) {
        try {
            const data = await Data.list(pool, {
                source: job.source_name,
                layer: job.layer,
                name: job.name
            });
        } catch (err) {
            throw new Err(500, err, 'Failed to fetch data');
        }

        try {
            await Bin.match(pool, job);
        } catch (err) {
            throw new Err(500, err, 'Failed to match coverage');
        }

        if (data.length > 1) {
            throw new Err(500, null, 'More than 1 source matches job');
        } else if (data.length === 0) {
            try {
                await pool.query(`
                    INSERT INTO results (
                        source,
                        layer,
                        name,
                        job,
                        updated
                    ) VALUES (
                        $1,
                        $2,
                        $3,
                        $4,
                        NOW()
                    )
                `, [
                    job.source_name,
                    job.layer,
                    job.name,
                    job.id
                ]);

                return true;
            } catch (err) {
                throw new Err(500, err, 'Failed to update data');
            }
        } else {
            try {
                await pool.query(`
                    UPDATE results
                        SET
                            source = $1,
                            layer = $2,
                            name = $3,
                            job = $4,
                            updated = NOW()
                        WHERE
                            source = $1
                            AND layer = $2
                            AND name = $3
                `, [
                    job.source_name,
                    job.layer,
                    job.name,
                    job.id
                ]);

                return true;
            } catch (err) {
                throw new Err(500, err, 'Failed to update data');
            }
        }
    }
}

module.exports = Data;
