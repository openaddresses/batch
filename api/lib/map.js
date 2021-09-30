const fs = require('fs');
const { sql } = require('slonik');
const hash = require('object-hash');
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

class Map {
    static map() {
        return {
            token: process.env.MAPBOX_TOKEN
        };
    }

    static async from(pool, code) {
        try {
            const pgres = await pool.query(sql`
                SELECT
                    id
                FROM
                    map
                WHERE
                    code = ${code}
                LIMIT 1
            `);

            if (pgres.rows.length === 0) return false;

            return pgres.rows[0].id;
        } catch (err) {
            throw new Err(500, err, 'Failed to fetch map id');
        }
    }

    static async fabric_tile(tb, z, x, y) {
        try {
            return await tb.tile(z, x, y);
        } catch (err) {
            throw new Err(500, err, 'Failed to fetch tile');
        }
    }

    static async border_tile(pool, z, x, y) {
        try {
            const bbox = sm.bbox(x, y, z, false, '900913');

            let code = null;
            if (z < 2) code = '^[a-z]{2}$';
            else if (z < 4) code = '^[a-z]{2}-[a-z]+$';
            else if (z === 5) code = '^[a-z]{2}-[0-9]+$';

            const pgres = await pool.query(sql`
                SELECT
                    ST_AsMVT(q, 'data', 4096, 'geom') AS mvt
                FROM (
                    SELECT
                        n.code,
                        n.name,
                        ST_AsMVTGeom(
                            ST_Transform(geom, 3857),
                            ST_SetSRID(ST_MakeBox2D(
                                ST_MakePoint(${bbox[0]}, ${bbox[1]}),
                                ST_MakePoint(${bbox[2]}, ${bbox[3]})
                            ), 3857),
                            4096,
                            256,
                            false
                        ) AS geom
                    FROM (
                        SELECT
                            map.name,
                            map.code,
                            map.geom
                        FROM
                            map
                        WHERE
                            (${code}::TEXT IS NULL OR code ~ ${code})
                            AND ST_Intersects(
                                map.geom,
                                ST_Transform(ST_SetSRID(ST_MakeBox2D(
                                    ST_MakePoint(${bbox[0]}, ${bbox[1]}),
                                    ST_MakePoint(${bbox[2]}, ${bbox[3]})
                                ), 3857), 4326)
                        )
                    ) n
                    GROUP BY
                        n.name,
                        n.code,
                        n.geom
                ) q
            `);

            return pgres.rows[0].mvt;
        } catch (err) {
            throw new Err(500, err, 'Failed to generate tile');
        }
    }

    static async tile(pool, z, x, y) {
        try {
            const bbox = sm.bbox(x, y, z, false, '900913');

            const pgres = await pool.query(sql`
                SELECT
                    ST_AsMVT(q, 'data', 4096, 'geom') AS mvt
                FROM (
                    SELECT
                        n.code,
                        addresses,
                        buildings,
                        parcels,
                        ST_AsMVTGeom(
                            ST_Transform(geom, 3857),
                            ST_SetSRID(ST_MakeBox2D(
                                ST_MakePoint(${bbox[0]}, ${bbox[1]}),
                                ST_MakePoint(${bbox[2]}, ${bbox[3]})
                            ), 3857),
                            4096,
                            256,
                            false
                        ) AS geom
                    FROM (
                        SELECT
                            map.id,
                            map.name,
                            map.code,
                            map.geom,
                            job.layer = 'addresses' AS addresses,
                            job.layer = 'buildings' AS buildings,
                            job.layer = 'parcels' AS parcels
                        FROM
                            map INNER JOIN job ON map.id = job.map
                        WHERE
                            ST_Intersects(
                                map.geom,
                                ST_Transform(ST_SetSRID(ST_MakeBox2D(
                                    ST_MakePoint(${bbox[0]}, ${bbox[1]}),
                                    ST_MakePoint(${bbox[2]}, ${bbox[3]})
                                ), 3857), 4326)
                        )
                    ) n
                    GROUP BY
                        n.addresses,
                        n.buildings,
                        n.parcels,
                        n.code,
                        n.geom
                ) q
            `);

            return pgres.rows[0].mvt;
        } catch (err) {
            throw new Err(500, err, 'Failed to generate tile');
        }
    }

    static async get_feature(pool, code) {
        try {
            const pgres = await pool.query(sql`
                SELECT
                    MAX(map.id) AS id,
                    MAX(map.name) AS name,
                    MAX(map.code) AS code,
                    MAX(map.geom) AS geom,
                    COALESCE(ARRAY_AGG(DISTINCT job.layer), '{}') AS layers
                FROM
                    map LEFT JOIN job ON map.id = job.map
                WHERE
                    code = ${code}
            `);

            if (!pgres.rows.length) throw new Err(400, null, 'Feature not found');

            pgres.rows[0].id = parseInt(pgres.rows[0].id);
            pgres.rows[0].layers = pgres.rows[0].layers.filter((layer) => !!layer);

            return pgres.rows[0];
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

        const keys = Object.keys(raw.coverage).filter((key) => {
            return !['iso 3166', 'us census'].includes(key.toLowerCase());
        });

        let code = false;
        let geom = false;

        if ( // US Counties
            raw.coverage['US Census']
            && raw.coverage['US Census'].geoid
            && raw.coverage['US Census'].geoid.length === 5
        ) {
            code = 'us-' + raw.coverage['US Census'].geoid;
        } else if (raw.coverage.geometry) {
            geom = raw.coverage.geometry;
            code = hash(raw.coverage.geometry.coordinates);
        } else if (eq(keys, ['country'])) {
            code = raw.coverage.country.toLowerCase();
        } else if (eq(keys, ['country', 'state'])) {
            if (raw.coverage['ISO 3166'] && raw.coverage['ISO 3166'].alpha2) {
                code = raw.coverage['ISO 3166'].alpha2.toLowerCase();
            } else {
                const country = raw.coverage.country.toLowerCase();
                const state = raw.coverage.state.toLowerCase();
                code = `${country}-${state}`;
            }
        }

        // Currently unhandled
        // Get List:
        //   jq -rc '.coverage | keys' sources/**/*.json | sort | uniq | vim -
        // Find specific:
        //   jq -rc '{ "keys": .coverage | keys, "file": input_filename } ' sources/**/*.json | vim -
        //
        // ["city","country"]
        // ["city","country","state"]
        // ["country","county","state"]
        // ["country","state","town"]


        if (!code) return false;

        let bin_id = await Map.from(pool, code);

        if (!bin_id && geom) {
            try {
                bin_id = await Map.add(pool, job.source_name, code, geom);
            } catch (err) {
                console.error('not ok - failed to save new geom to map: ' + err);
            }
        } else if (!bin_id) {
            return false;
        }

        job.map = bin_id;
        await job.commit(pool);

        return true;
    }

    static async add(pool, name, code, geom) {
        try {
            const pgres = await pool.query(sql`
                INSERT INTO map (
                    name,
                    code,
                    geom
                ) VALUES (
                    ${name},
                    ${code},
                    ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geom)}), 4326)
                )
                RETURNING id
            `);

            return pgres.rows[0].id;
        } catch (err) {
            throw new Err(500, err, 'Failed to add custom geojson to map');
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
                        if (!feat || !feat.trim()) return cb(null, '');

                        try {
                            feat = JSON.parse(feat);
                        } catch (err) {
                            return cb(err);
                        }

                        pool.query(sql`
                            INSERT INTO map (
                                name,
                                code,
                                geom
                            ) VALUES (
                                ${feat.properties.name},
                                ${feat.properties.code},
                                ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(feat.geometry)}), 4326)
                            );
                        `, (err) => {
                            if (err) return cb(err);
                            return cb(null, '');
                        });
                    }),
                    fs.createWriteStream('/dev/null'),
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

function eq(a, b) {
    a.sort();
    b.sort();

    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }

    return true;
}

module.exports = Map;
