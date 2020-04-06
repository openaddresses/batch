'use strict';

const split = require('split');
const SM = require('@mapbox/sphericalmercator');
const { pipeline } = require('stream');
const transform = require('parallel-transform');
const AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: process.env.AWS_DEFAULT_REGION });
const Q = require('d3-queue').queue;

const Err = require('./error');

const MAP_LAYERS = [
    'district.geojson',
    'region.geojson',
    'country.geojson'
];

const sm = new SM({
    size: 256
});

class Bin {
    static map() {
        return {
            token: process.env.MAPBOX_TOKEN
        };
    }

    static async tile(pool, z, x, y) {
        try {
            const bbox = sm.bbox(x, y, z, false, '900913');

            const pgres = await pool.query(`
                SELECT
                    ST_AsMVT(q, 'data', 4096, 'geom') AS mvt
                FROM (
                    SELECT
                        code,
                        JSON_object(ARRAY_AGG(k)::TEXT[], ARRAY_AGG(v)::TEXT[]) AS layers,
                        ST_AsMVTGeom(
                            ST_Transform(geom, 3857),
                            ST_SetSRID(ST_MakeBox2D(
                                ST_MakePoint($1, $2),
                                ST_MakePoint($3, $4)
                            ), 3857),
                            4096,
                            256,
                            false
                        ) AS geom
                    FROM (
                        SELECT
                            code,
                            geom,
                            unnest(layers) AS k,
                            true AS v
                        FROM map
                    ) n
                    WHERE
                        ST_Intersects(
                            geom,
                            ST_Transform(ST_SetSRID(ST_MakeBox2D(
                                ST_MakePoint($1, $2),
                                ST_MakePoint($3, $4)
                            ), 3857), 4326)
                        )
                    GROUP BY
                        n.code,
                        n.geom
                ) q
            `, [
                bbox[0],
                bbox[1],
                bbox[2],
                bbox[3]
            ]);

            return pgres.rows[0].mvt;
        } catch (err) {
            throw new Err(500, err, 'Failed to generate tile');
        }
    }

    static async get_feature(pool, code) {
        try {
            const pgres = await pool.query(`
                SELECT
                    *
                FROM
                    map
                WHERE
                    code = $1
            `, [
                code
            ]);

            if (!pgres.rows.length) throw new Err(400, null, 'Feature not found');

            return pgres.rows[0];
        } catch (err) {
            throw new Err(500, err, 'Failed to update map');
        }
    }

    static async update(pool, code, layer) {
        console.error(`ok - Updating Map: ${code}`);
        try {
            await pool.query(`
                UPDATE map
                    SET
                        layers = (
                            SELECT Array_Agg(DISTINCT e)
                            FROM Unnest(layers || $2::TEXT[]) e
                        )
                WHERE
                    NOT layers @> '{$2}'::TEXT[]
                    AND code = $1
            `, [
                code,
                [layer]
            ]);

            return true;
        } catch (err) {
            throw new Err(500, err, 'Failed to update map');
        }
    }

    /**
     * Given a job object, attempt to parse the .coverage object
     * and match it with an existing geometry, or if a geometry is
     * given, add it to the map if it does not exist
     *
     * @param {Pool} pool PG Pool Instance
     * @param {Job} job Job to match
     */
    static async match(pool, job) {
        const raw = await job.get_raw();

        if (!raw.coverage) return true;

        if ( // US Counties
            raw.coverage['US Census']
            && raw.coverage['US Census'].geoid
            && raw.coverage['US Census'].geoid.length === 5
        ) {
            await Bin.update(pool, raw.coverage['US Census'].geoid, job.layer);
        }

        return true;
    }

    static async populate(pool) {
        console.error('ok - populating map table');
        const q = new Q();

        for (const layer of MAP_LAYERS) {
            q.defer((layer, done) => {
                pipeline(
                    s3.getObject({
                        Bucket: 'v2.openaddresses.io',
                        Key: layer
                    }).createReadStream(),
                    split(),
                    transform(100, (feat, cb) => {
                        try {
                            feat = JSON.parse(feat);
                        } catch (err) {
                            return cb(err);
                        }

                        pool.query(`
                            INSERT INTO map (
                                name,
                                code,
                                geom,
                                layers
                            ) VALUES (
                                $1,
                                $2,
                                ST_SetSRID(ST_GeomFromGeoJSON($3), 4326),
                                '{}'
                            );
                        `, [
                            feat.properties.name,
                            feat.properties.code,
                            JSON.stringify(feat.geometry)
                        ], (err) => {
                            if (err) return cb(err);
                            return cb();
                        });
                    }),
                    done
                );
            }, layer);
        }

        return new Promise((resolve, reject) => {
            q.awaitAll((err) => {
                if (err) return reject(err);

                console.error('ok - layers populated');
                return resolve(true);
            });
        });
    }
}

module.exports = Bin;
