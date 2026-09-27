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
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { PgInsertValue } from 'drizzle-orm/pg-core';
import Err from '@openaddresses/batch-error';
import { sql, eq } from 'drizzle-orm';
import { Map } from '../schema.js';
import JobModel from './Job.js';
import type { JobAugmented } from './Job.js';

const gzip = promisify(zlib.gzip);

const s3 = new S3.S3Client({ region: process.env.AWS_DEFAULT_REGION });

const MAP_LAYERS = [
    'district.geojson',
    'region.geojson',
    'country.geojson',
];

interface Coverage {
    'US Census'?: { geoid?: string };
    'ISO 3166'?: { alpha2?: string };
    'geometry'?: { coordinates?: unknown; [k: string]: unknown };
    'country'?: string;
    'state'?: string;
    [k: string]: unknown;
}

export interface MapFeature {
    id: number | null;
    code: string | null;
    name: string | null;
    bbox: number[];
    geom: unknown;
}

const sm = new SM({
    size: 256,
});

export default class MapModel extends Modeler<typeof Map> {
    job: JobModel;

    constructor(pool: PostgresJsDatabase<Record<string, unknown>>) {
        super(pool, Map);

        this.job = new JobModel(pool);
    }

    static map(): { protomaps_key: string | undefined } {
        return {
            protomaps_key: process.env.PROTOMAPS_KEY,
        };
    }

    /**
     * Stream all Map Features as Line Delimited GeoJSON
     */
    feature_stream(): Readable {
        const pool = this.pool;

        async function* features() {
            const coverage = new globalThis.Map<number, string[]>();
            for (const row of await pool.execute<{ map: number; layer: string[] }>(sql`
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
                rows = await pool.execute<{ id: number; name: string; code: string; geometry: unknown }>(sql`
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
                            parcels: layers ? layers.includes('parcels') : null,
                        },
                        geometry: row.geometry,
                    }) + '\n';
                }
            } while (rows.length);
        }

        return Readable.from(features());
    }

    async from_id(mapid: number): Promise<MapFeature | false> {
        try {
            const pgres = await this.pool.select({
                id: Map.id,
                code: Map.code,
                name: Map.name,
                bbox: sql<string>`ST_Extent(${Map.geom})`,
                geom: sql`ST_AsGeoJSON(${Map.geom})::JSONB`,
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
                bbox: pgres[0].bbox.replace('BOX(', '').replace(')', '').split(',').join(' ').split(' ').map(e => Number(e)),
                geom: pgres[0].geom,
            };
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Failed to fetch map id');
        }
    }

    /**
     * Return the Map ID for a given code, or false if no feature exists
     */
    async from_code(code: string): Promise<number | false> {
        try {
            const pgres = await this.pool.select({
                id: Map.id,
            })
                .from(Map)
                .where(eq(Map.code, code))
                .limit(1);

            if (pgres.length === 0) return false;

            return pgres[0].id;
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Failed to fetch map id');
        }
    }

    async tile(z: number, x: number, y: number): Promise<Buffer> {
        try {
            const bbox = sm.bbox(x, y, z, false, '900913');

            const pgres = await this.pool.execute<{ mvt: Buffer }>(sql`
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
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Failed to generate tile');
        }
    }

    async get_feature(code: string): Promise<Record<string, unknown>> {
        try {
            const pgres = await this.pool.execute<{ id: string | null; name: string | null; code: string | null; geom: unknown; layers: string[] }>(sql`
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

            const row = pgres[0];
            return {
                ...row,
                id: row.id === null ? null : Number(row.id),
                layers: row.layers.filter(layer => !!layer),
            };
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Failed to update map');
        }
    }

    /**
     * Given a job object, attempt to parse the .coverage object
     * and match it with an existing geometry, or if a geometry is
     * given, add it to the map if it does not exist
     */
    async match(job: JobAugmented): Promise<boolean> {
        const raw = await JobModel.raw(job);
        const coverage = (raw.coverage ?? undefined) as Coverage | undefined;

        if (!coverage) return true;

        const keys = Object.keys(coverage).filter((key) => {
            return !['iso 3166', 'us census'].includes(key.toLowerCase());
        });

        let code: string | false = false;
        let geom: Record<string, unknown> | false = false;

        if ( // US Counties
            coverage['US Census']
            && coverage['US Census'].geoid
            && coverage['US Census'].geoid.length === 5
        ) {
            code = 'us-' + coverage['US Census'].geoid;
        } else if (coverage.geometry) {
            geom = coverage.geometry;
            code = hash(coverage.geometry.coordinates as object);
        } else if (eq_list(keys, ['country'])) {
            code = String(coverage.country).toLowerCase();
        } else if (eq_list(keys, ['country', 'state'])) {
            if (coverage['ISO 3166'] && coverage['ISO 3166'].alpha2) {
                code = coverage['ISO 3166'].alpha2.toLowerCase();
            } else {
                const country = String(coverage.country).toLowerCase();
                const state = String(coverage.state).toLowerCase();
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

        let bin_id: number | false = await this.from_code(code);

        if (!bin_id && geom) {
            try {
                bin_id = await this.add(String(job.source_name), code, geom);
            } catch (err) {
                console.error('not ok - failed to save new geom to map: ' + err);
            }
        } else if (!bin_id) {
            return false;
        }

        await this.job.commit(Number(job.id), {
            map: bin_id,
        });

        job.map = bin_id || null;

        return true;
    }

    async add(name: string, code: string, geom: Record<string, unknown>): Promise<number> {
        try {
            const feature = await this.generate({
                name,
                code,
                geom,
            } as unknown as PgInsertValue<typeof Map>);

            return feature.id;
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Failed to add custom geojson to map');
        }
    }

    async populate(): Promise<boolean> {
        console.error('ok - populating map table');

        for (const layer of MAP_LAYERS) {
            await pipeline(
                (await s3.send(new S3.GetObjectCommand({
                    Bucket: 'v2.openaddresses.io',
                    Key: layer,
                }))).Body as Readable,
                split(),
                transform(100, (feat: string, cb: (err: Error | null, data?: string) => void) => {
                    if (!feat || !feat.trim()) return cb(null, '');

                    let parsed: { properties: { name: string; code: string }; geometry: unknown };
                    try {
                        parsed = JSON.parse(feat);
                    } catch (err) {
                        return cb(err instanceof Error ? err : new Error(String(err)));
                    }

                    this.generate({
                        name: parsed.properties.name,
                        code: parsed.properties.code,
                        geom: parsed.geometry,
                    } as unknown as PgInsertValue<typeof Map>).then(() => cb(null, ''), cb);
                }),
                fs.createWriteStream('/dev/null'),
            );
        }

        console.error('ok - layers populated');
        return true;
    }
}

function eq_list(a: string[], b: string[]): boolean {
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
