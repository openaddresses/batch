'use strict';

const Err = require('./error');
const Map = require('./map');

/**
 * @class Data
 */
class Data {
    /**
     * Return the last sucessful state for all data runs
     *
     * @param {Pool} pool - Postgres Pool Instance
     * @param {Object} query - Query object
     * @param {String} [query.source=Null] - Filter results by source
     * @param {String} [query.layer=Null] - Filter results by source layer
     * @param {String} [query.name=Null] - Filter results by source layer name
     * @param {String} [query.point=false] - Filter results by geographic point
     * @param {Boolean} query.fabric - Filter results by if they are part of the fabric
     */
    static async list(pool, query) {
        if (!query) query = {};

        if (!query.source) query.source = '';
        if (!query.layer || query.layer === 'all') query.layer = '';
        if (!query.name) query.name = '';

        if (!query.point) {
            query.point = '';
        } else {
            query.point = query.point.split(',');

            if (query.point.length !== 2) {
                throw new Err(404, null, 'invalid point query');
            }

            query.point = `POINT(${query.point.join(' ')})`;
        }

        query.source = '%' + query.source + '%';
        query.layer = query.layer + '%';
        query.name = query.name + '%';

        try {
            const pgres = await pool.query(`
                SELECT
                    results.id,
                    results.fabric,
                    results.source,
                    results.updated,
                    results.layer,
                    results.name,
                    results.job,
                    job.output,
                    job.size
                FROM
                    results
                        INNER JOIN
                            job LEFT JOIN map
                                ON job.map = map.id
                            ON results.job = job.id
                WHERE
                    results.source ilike $1
                    AND results.layer ilike $2
                    AND results.name ilike $3
                    AND (
                        char_length($4) = 0
                        OR ST_DWithin(ST_SetSRID(ST_PointFromText($4), 4326), map.geom, 1.0)
                    )
                    ${query.fabric !== undefined ? 'AND results.fabric = ' + !!query.fabric : ''}
                ORDER BY
                    results.source,
                    results.layer,
                    results.name
            `, [
                query.source,
                query.layer,
                query.name,
                query.point
            ]);

            return pgres.rows.map((res) => {
                res.id = parseInt(res.id);
                res.job = parseInt(res.job);
                res.size = parseInt(res.size);
                res.s3 = `s3://${process.env.Bucket}/${process.env.StackName}/job/${res.job}/source.geojson.gz`;

                return res;
            });
        } catch (err) {
            throw new Err(500, err, 'Failed to load data');
        }
    }

    /**
     * Return a complete job history for a given data source
     * (jobs part of live run & in success status)
     *
     * @param {Pool} pool - Postgres Pool Instance
     * @param {Numeric} data_id - ID of data row
     */
    static async history(pool, data_id) {
        try {
            const pgres = await pool.query(`
                SELECT
                    job.id,
                    job.created,
                    job.status,
                    job.output,
                    job.run,
                    job.count,
                    job.stats
                FROM
                    results INNER JOIN job
                        ON
                            job.source_name = results.source
                            AND job.layer = results.layer
                            AND job.name = results.name
                        INNER JOIN runs
                            ON job.run = runs.id
                WHERE
                    runs.live = true
                    AND results.id = $1
                    AND job.status = 'Success'
                ORDER BY
                    created DESC
            `, [
                data_id
            ]);

            if (!pgres.rows.length) {
                throw new Err(404, null, 'No data by that id');
            }

            return {
                id: parseInt(data_id),
                jobs: pgres.rows.map((res) => {
                    res.id = parseInt(res.id);
                    res.count = parseInt(res.count);
                    res.run = parseInt(res.run);
                    res.s3 = `s3://${process.env.Bucket}/${process.env.StackName}/job/${res.id}/source.geojson.gz`;
                    return res;
                })
            };
        } catch (err) {
            throw new Err(500, err, 'Failed to get data history');
        }
    }

    static async commit(pool, data) {
        let pgres;
        try {
            pgres = await pool.query(`
                UPDATE results
                    SET
                        fabric = COALESCE($2, fabric, False)
                    WHERE
                        id = $1
                    RETURNING
                        *
            `, [
                data.id,
                data.fabric
            ]);
        } catch (err) {
            throw new Err(500, err, 'failed to save result');
        }

        return pgres.rows.map((res) => {
            res.id = parseInt(res.id);
            res.job = parseInt(res.job);
            res.size = parseInt(res.size);
            res.s3 = `s3://${process.env.Bucket}/${process.env.StackName}/job/${res.job}/source.geojson.gz`;
            return res;
        })[0];
    }

    static async from(pool, data_id) {
        try {
            const pgres = await pool.query(`
                SELECT
                    results.id,
                    results.source,
                    results.fabric,
                    results.updated,
                    results.layer,
                    results.name,
                    results.job,
                    job.output,
                    job.size
                FROM
                    results,
                    job
                WHERE
                    results.job = job.id
                    AND results.id = $1
            `, [
                data_id
            ]);

            if (!pgres.rows.length) {
                throw new Err(404, null, 'No data by that id');
            }

            return pgres.rows.map((res) => {
                res.id = parseInt(res.id);
                res.job = parseInt(res.job);
                res.size = parseInt(res.size);
                res.s3 = `s3://${process.env.Bucket}/${process.env.StackName}/job/${res.job}/source.geojson.gz`;
                return res;
            })[0];
        } catch (err) {
            throw new Err(500, err, 'Failed to load data');
        }
    }

    static async update(pool, job, fabric) {
        let data;
        try {
            data = await Data.list(pool, {
                source: job.source_name,
                layer: job.layer,
                name: job.name
            });
        } catch (err) {
            throw new Err(500, err, 'Failed to fetch data');
        }

        try {
            await Map.match(pool, job);
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
                        updated,
                        fabric
                    ) VALUES (
                        $1,
                        $2,
                        $3,
                        $4,
                        NOW(),
                        $5
                    )
                `, [
                    job.source_name,
                    job.layer,
                    job.name,
                    job.id,
                    !!fabric
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
                            job = $4,
                            updated = NOW(),
                            fabric = COALESCE($5, fabric, False)
                        WHERE
                            source = $1
                            AND layer = $2
                            AND name = $3
                `, [
                    job.source_name,
                    job.layer,
                    job.name,
                    job.id,
                    fabric
                ]);

                return true;
            } catch (err) {
                throw new Err(500, err, 'Failed to update data');
            }
        }
    }
}

module.exports = Data;
