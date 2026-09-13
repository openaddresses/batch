import fs from 'fs';
import zlib from 'zlib';
import { promisify } from 'util';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import hash from 'object-hash';
import split from 'split';
import SM from '@mapbox/sphericalmercator';
import transform from 'parallel-transform';
import S3 from '@aws-sdk/client-s3';
import Modeler from '@openaddresses/batch-generic';
import Err from '@openaddresses/batch-error';
import { sql, eq } from 'drizzle-orm';
import { Map } from '../schema.js';
import JobModel from './Job.js';

const gzip = promisify(zlib.gzip);

const s3 = new S3.S3Client({ region: process.env.AWS_DEFAULT_REGION });

const MAP_LAYERS = [
    'district.geojson',
    'region.geojson',
    'country.geojson'
];

const sm = new SM({
    size: 256
});

export default class MapModel extends Modeler {
    constructor(pool) {
        super(pool, Map);

        this.job = new JobModel(pool);
    }

    static map() {
        return {
            protomaps_key: process.env.PROTOMAPS_KEY
        };
    }

    /**
     * Stream all Map Features as Line Delimited GeoJSON
     *
     * @returns {Readable}
     */
    stream() {
        const pool = this.pool;

        async function* features() {
            const coverage = new globalThis.Map();
            for (const row of await pool.execute(sql`
                SELECT
                    job.map,
                    ARRAY_AGG(job.layer) AS layer
                FROM
                    results,
                    job
                WHERE
                    results.job = job.id
                    AND map IS NOT NULL
                GROUP BY
                    map
            `)) {
                coverage.set(Number(row.map), row.layer);
            }

            let cursor = 0;
            let rows;
            do {
                rows = await pool.execute(sql`
                    SELECT
                        id,
                        name,
                        code,
                        ST_AsGeoJSON(geom)::JSON AS geometry
                    FROM
                        map
                    WHERE
                        id > ${cursor}::BIGINT
                    ORDER BY
                        id ASC
                    LIMIT 1000
                `);

                for (const row of rows) {
                    cursor = Number(row.id);
                    const layers = coverage.get(cursor) || null;

                    yield JSON.stringify({
                        id: cursor,
                        type: 'Feature',
                        properties: {
                            id: cursor,
                            name: row.name,
                            code: row.code,
                            addresses: layers ? layers.includes('addresses') : null,
                            buildings: layers ? layers.includes('buildings') : null,
                            parcels: layers ? layers.includes('parcels') : null
                        },
                        geometry: row.geometry
                    }) + '\n';
                }
            } while (rows.length);
        }

        return Readable.from(features());
    }

    async from_id(mapid) {
        try {
            const pgres = await this.pool.select({
                id: Map.id,
                code: Map.code,
                name: Map.name,
                bbox: sql`ST_Extent(${Map.geom})`,
                geom: sql`ST_AsGeoJSON(${Map.geom})::JSONB`
            })
                .from(Map)
                .where(eq(Map.id, mapid))
                .groupBy(Map.id, Map.code, Map.name, Map.geom)
                .limit(1);

            if (pgres.length === 0) return false;

            return {
                id: pgres[0].id,
                code: pgres[0].code,
                name: pgres[0].name,
                bbox: pgres[0].bbox.replace('BOX(', '').replace(')', '').split(',').join(' ').split(' ').map((e) => Number(e)),
                geom: pgres[0].geom
            };
        } catch (err) {
            throw new Err(500, err, 'Failed to fetch map id');
        }
    }

    /**
     * Return the Map ID for a given code, or false if no feature exists
     *
     * @param {String} code Map Code
     */
    async from_code(code) {
        try {
            const pgres = await this.pool.select({
                id: Map.id
            })
                .from(Map)
                .where(eq(Map.code, code))
                .limit(1);

            if (pgres.length === 0) return false;

            return pgres[0].id;
        } catch (err) {
            throw new Err(500, err, 'Failed to fetch map id');
        }
    }

    async tile(z, x, y) {
        try {
            const bbox = sm.bbox(x, y, z, false, '900913');

            const pgres = await this.pool.execute(sql`
                SELECT
                    ST_AsMVT(q, 'data', 4096, 'geom', 'id') AS mvt
                FROM (
                    SELECT
                        n.id,
                        n.code,
                        n.addresses,
                        n.buildings,
                        n.parcels,
                        ST_AsMVTGeom(
                            ST_Transform(n.geom, 3857),
                            ST_SetSRID(ST_MakeBox2D(
                                ST_MakePoint(${bbox[0]}::FLOAT, ${bbox[1]}::FLOAT),
                                ST_MakePoint(${bbox[2]}::FLOAT, ${bbox[3]}::FLOAT)
                            ), 3857),
                            4096,
                            256,
                            false
                        ) AS geom
                    FROM (
                        SELECT
                            map.id,
                            map.code,
                            map.geom,
                            cov.layer @> ARRAY['addresses'] AS addresses,
                            cov.layer @> ARRAY['buildings'] AS buildings,
                            cov.layer @> ARRAY['parcels'] AS parcels
                        FROM
                            map
                            INNER JOIN (
                                SELECT
                                    job.map,
                                    ARRAY_AGG(job.layer) AS layer
                                FROM
                                    results,
                                    job
                                WHERE
                                    results.job = job.id
                                    AND job.map IS NOT NULL
                                GROUP BY
                                    job.map
                            ) cov ON map.id = cov.map
                        WHERE
                            ST_Intersects(
                                map.geom,
                                ST_Transform(ST_SetSRID(ST_MakeBox2D(
                                    ST_MakePoint(${bbox[0]}::FLOAT, ${bbox[1]}::FLOAT),
                                    ST_MakePoint(${bbox[2]}::FLOAT, ${bbox[3]}::FLOAT)
                                ), 3857), 4326)
                            )
                    ) n
                ) q
            `);

            return gzip(pgres[0].mvt);
        } catch (err) {
            throw new Err(500, err, 'Failed to generate tile');
        }
    }

    async get_feature(code) {
        try {
            const pgres = await this.pool.execute(sql`
                SELECT
                    MAX(map.id) AS id,
                    MAX(map.name) AS name,
                    MAX(map.code) AS code,
                    MAX(map.geom) AS geom,
                    COALESCE(ARRAY_AGG(DISTINCT job.layer) FILTER (WHERE job.layer IS NOT NULL), '{}') AS layers
                FROM
                    map LEFT JOIN job ON map.id = job.map
                WHERE
                    code = ${code}
            `);

            if (!pgres.length) throw new Err(400, null, 'Feature not found');

            const feature = pgres[0];
            feature.id = feature.id === null ? null : Number(feature.id);
            feature.layers = feature.layers.filter((layer) => !!layer);

            return feature;
        } catch (err) {
            throw new Err(500, err, 'Failed to update map');
        }
    }

    /**
     * Given a job object, attempt to parse the .coverage object
     * and match it with an existing geometry, or if a geometry is
     * given, add it to the map if it does not exist
     *
     * @param {Object} job Job row to match
     */
    async match(job) {
        const raw = await JobModel.raw(job);

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
        } else if (eq_list(keys, ['country'])) {
            code = raw.coverage.country.toLowerCase();
        } else if (eq_list(keys, ['country', 'state'])) {
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

        let bin_id = await this.from_code(code);

        if (!bin_id && geom) {
            try {
                bin_id = await this.add(job.source_name, code, geom);
            } catch (err) {
                console.error('not ok - failed to save new geom to map: ' + err);
            }
        } else if (!bin_id) {
            return false;
        }

        await this.job.commit(job.id, {
            map: bin_id
        });

        job.map = bin_id;

        return true;
    }

    async add(name, code, geom) {
        try {
            const feature = await this.generate({
                name,
                code,
                geom
            });

            return feature.id;
        } catch (err) {
            throw new Err(500, err, 'Failed to add custom geojson to map');
        }
    }

    async populate() {
        console.error('ok - populating map table');

        for (const layer of MAP_LAYERS) {
            await pipeline(
                (await s3.send(new S3.GetObjectCommand({
                    Bucket: 'v2.openaddresses.io',
                    Key: layer
                }))).Body,
                split(),
                transform(100, (feat, cb) => {
                    if (!feat || !feat.trim()) return cb(null, '');

                    try {
                        feat = JSON.parse(feat);
                    } catch (err) {
                        return cb(err);
                    }

                    this.generate({
                        name: feat.properties.name,
                        code: feat.properties.code,
                        geom: feat.geometry
                    }).then(() => cb(null, ''), cb);
                }),
                fs.createWriteStream('/dev/null')
            );
        }

        console.error('ok - layers populated');
        return true;
    }
}

function eq_list(a, b) {
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
