'use strict';

const Err = require('./error');
const Bin = require('./bin');

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
            throw new Err(500, err, 'failed to load data');
        }
    }

    static async update(pool, job) {
        const data = await Data.list(pool, {
            source: job.fullname(),
            layer: job.layer,
            name: job.name
        });

        await Bin.match(pool, job);

        return new Promise((resolve, reject) => {
            if (data.length > 1) {
                throw Err(500, null, 'More than 1 source matches job');
            } else if (data.length === 0) {
                pool.query(`
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
                    job.fullname(),
                    job.layer,
                    job.name,
                    job.id
                ], (err) => {
                    if (err) return reject(new Err(500, err, 'Failed to update data'));

                    return resolve(true);
                });
            } else {
                pool.query(`
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
                    job.fullname(),
                    job.layer,
                    job.name,
                    job.id
                ], (err) => {
                    if (err) return reject(new Err(500, err, 'Failed to update data'));

                    return resolve(true);
                });
            }
        });
    }
}

module.exports = Data;
