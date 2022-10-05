import Err from '@openaddresses/batch-error';
import Generic from '@openaddresses/batch-generic';
import Map from './map.js';
import fs from 'fs';
import moment from 'moment';
import { sql } from 'slonik';

/**
 * @class
 */
export default class Data extends Generic {
    static _table = 'results';

    /**
     * Return the last sucessful state for all data runs
     *
     * @param {Pool} pool - Postgres Pool Instance
     * @param {Object} query - Query object
     * @param {String} [query.source=Null] - Filter results by source
     * @param {String} [query.layer=Null] - Filter results by source layer
     * @param {String} [query.name=Null] - Filter results by source layer name
     * @param {String} [query.before=Null] - Filter results run before the given date
     * @param {String} [query.after=Null] - Filter results run after the given date
     * @param {String} [query.point=false] - Filter results by geographic point
     * @param {Boolean} [query.validated=Null] - Filter results by whether a validated source file has been produced
     * @param {Boolean} query.fabric - Filter results by if they are part of the fabric
     * @param {Number} query.map - Filter results by associated mapid
     */
    static async list(pool, query) {
        if (!query) query = {};

        if (!query.source) query.source = '';
        if (!query.layer || query.layer === 'all') query.layer = '';
        if (!query.name) query.name = '';

        if (!query.before) query.before = null;
        if (!query.after) query.after = null;

        if (query.before) query.before = moment(query.before).format('YYYY-MM-DD');
        if (query.after) query.after = moment(query.after).format('YYYY-MM-DD');

        if (!query.map) query.map = null;
        if (!query.fabric) query.fabric = null;
        if (!query.validated) query.validated = null;

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
            const pgres = await pool.query(sql`
                SELECT
                    results.id,
                    results.fabric,
                    results.source,
                    results.updated,
                    results.layer,
                    results.name,
                    results.job,
                    job.output,
                    job.size,
                    job.map
                FROM
                    results
                        INNER JOIN
                            job LEFT JOIN map
                                ON job.map = map.id
                            ON results.job = job.id
                WHERE
                    results.source ilike ${query.source}
                    AND results.layer ilike ${query.layer}
                    AND results.name ilike ${query.name}
                    AND (${query.before}::TIMESTAMP IS NULL OR updated < ${query.before}::TIMESTAMP)
                    AND (${query.after}::TIMESTAMP IS NULL OR updated > ${query.after}::TIMESTAMP)
                    AND (${query.map}::BIGINT IS NULL OR job.map = ${query.map})
                    AND (
                        char_length(${query.point}) = 0
                        OR ST_DWithin(ST_SetSRID(ST_PointFromText(${query.point}), 4326), map.geom, 1.0)
                    )
                    AND (${query.fabric}::BOOLEAN IS NULL OR results.fabric = ${!!query.fabric})
                    AND (${query.validated}::BOOLEAN IS NULL OR (job.output->'validated')::BOOLEAN = ${!!query.validated})
                ORDER BY
                    results.source,
                    results.layer,
                    results.name
            `);

            pgres.rows.map((res) => {
                res.s3 = `s3://${process.env.Bucket}/${process.env.StackName}/job/${res.job}/source.geojson.gz`;
                return res;
            });

            return Data.deserialize_list(pgres);
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
            const pgres = await pool.query(sql`
                SELECT
                    job.id,
                    job.created,
                    job.status,
                    job.output,
                    job.run,
                    job.count,
                    job.stats,
                    job.map
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
                    AND results.id = ${data_id}
                    AND job.status = 'Success'
                ORDER BY
                    created DESC
            `);

            if (!pgres.rows.length) {
                throw new Err(404, null, 'No data by that id');
            }

            return {
                id: parseInt(data_id),
                jobs: pgres.rows.map((res) => {
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
            pgres = await pool.query(sql`
                UPDATE results
                    SET
                        fabric = COALESCE(${data.fabric}, fabric, False)
                    WHERE
                        id = ${data.id}
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
            res.s3 = `s3://${process.env.Bucket}/${process.env.StackName}/job/${res.job}/source.geojson.gz`;
            return res;
        })[0];
    }

    static async from(pool, data_id) {
        try {
            const pgres = await pool.query(sql`
                SELECT
                    results.id,
                    results.source,
                    results.fabric,
                    results.updated,
                    results.layer,
                    results.name,
                    results.job,
                    job.output,
                    job.size,
                    job.map
                FROM
                    results,
                    job
                WHERE
                    results.job = job.id
                    AND results.id = ${data_id}
            `);

            if (!pgres.rows.length) {
                throw new Err(404, null, 'No data by that id');
            }

            const data = this.deserialize(pool, pgres);
            data.s3 = `s3://${process.env.Bucket}/${process.env.StackName}/job/${data.job}/source.geojson.gz`;
            return data;
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

        if (data.total > 1) {
            throw new Err(500, null, 'More than 1 source matches job');
        } else if (data.total === 0) {
            try {
                await pool.query(sql`
                    INSERT INTO results (
                        source,
                        layer,
                        name,
                        job,
                        updated,
                        fabric
                    ) VALUES (
                        ${job.source_name},
                        ${job.layer},
                        ${job.name},
                        ${job.id},
                        NOW(),
                        ${!!fabric}
                    )
                `);

                return true;
            } catch (err) {
                throw new Err(500, err, 'Failed to update data');
            }
        } else {
            try {
                await pool.query(sql`
                    UPDATE results
                        SET
                            job = ${job.id},
                            updated = NOW(),
                            fabric = COALESCE(${fabric || null}, fabric, False)
                        WHERE
                            source = ${job.source_name}
                            AND layer = ${job.layer}
                            AND name = ${job.name}
                `);

                return true;
            } catch (err) {
                throw new Err(500, err, 'Failed to update data');
            }
        }
    }
}
