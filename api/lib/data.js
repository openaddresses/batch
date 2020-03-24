'use strict';

const Err = require('./error');

class Data {
    static list(pool, query) {
        if (!query.name) query.name = '';
        if (!query.layer) query.layer = '';

        query.name = query.name + '%';
        query.layer = query.layer + '%';

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
            `, [
                query.name,
                query.layer
            ], (err, pgres) => {
                if (err) return reject(new Err(500, err, 'failed to load data'));

                return resolve(pgres.rows);
            });
        });
    }
}

module.exports = Data;
