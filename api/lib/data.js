'use strict';

// const Err = require('./error');

class Data {
    static list(pool, query) {
        if (!query.name) query.name = '';
        if (!query.layer) query.layer = '';

        query.name = query.name + '%';
        query.layer = query.layer + '%';

        return new Promise((resolve, reject) => {
            pool.query(`
                SELECT
                    data.source,
                    data.updated,
                    data.layer,
                    data.name,
                    data.job,
                    job.output
                FROM
                    data,
                    job
                WHERE
                    data.job = job.id
                    AND data.source ilike $1
                    AND data.layer ilike $2
            `, [
                query.name
            ], (err, pgres) => {
                if (err) return reject(new Err(500, err, 'failed to load data'));

                return resolve(pgres.rows);
            });
        });
    }
}

module.exports = Data;
