'use strict';

const split = require('split');
const { pipeline } = require('stream');
const transform = require('parallel-transform');
const tb = require('@mapbox/tilebelt');
const AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: process.env.AWS_DEFAULT_REGION });
const Q = require('d3-queue').queue;

const Err = require('./error');

const MAP_LAYERS = ['district.geojson'];

class Bin {
    static map() {
        return {
            token: process.env.MapboxToken
        };
    }

    static async tile(pool, z, x, y) {
        try {
            const bbox = tb.tileToBBOX([x, y, z]);

            const pgres = await pool.query(`
                SELECT
                    ST_AsMVT(q, 'data', 4096, 'geom') AS mvt
                FROM (
                    SELECT
                        id,
                        props,
                        ST_AsMVTGeom(geom, ST_Transform(ST_MakeEnvelope($1, $2, $3, $4, 3857), 4326), 4096, 256, false) AS geom
                    FROM
                        geo
                    WHERE
                        ST_Intersects(geom, ST_Transform(ST_MakeEnvelope($1, $2, $3, $4, 3857), 4326))
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

    static async covered(pool, code, layer) {
        try {
            const pgres = await pool.query(`
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
