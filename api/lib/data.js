'use strict';

const Err = require('./error');

class Data {
    static list(pool, query) {
        if (!query.source) query.source = '';
        if (!query.layer) query.layer = '';
        if (!query.name) query.name = '';

        query.source = query.source + '%';
        query.layer = query.layer + '%';
        query.name = query.name + '%';

        return new Promise((resolve, reject) => {
            pool.query(`
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
            ], (err, pgres) => {
                if (err) return reject(new Err(500, err, 'failed to load data'));

                return resolve(pgres.rows.map((res) => {
                    res.job = parseInt(res.job);

                    return res;
                }));
            });
        });
    }

    static async update(pool, job) {
        let data;
        try {
            data = await Data.list(pool, {
                source: job.fullname(),
                layer: job.layer,
                name: job.name
            });
        } catch(err) {
            throw err;
        }

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
                ], (err, pgres) => {
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
                ], (err, pgres) => {
                    if (err) return reject(new Err(500, err, 'Failed to update data'));

                    return resolve(true);
                });
            }
        });
    }
}

module.exports = Data;
