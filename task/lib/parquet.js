import { DuckDBInstance } from '@duckdb/node-api';

// Explicit output columns. Features are read as raw JSON objects
// (read_ndjson_objects) and picked apart per field: read_json would sample
// the file to infer a schema, a typed STRUCT nulls out the whole row when a
// key is missing (oa_backfill is only present on backfilled records), and
// read_json special-cases .geojson files once the spatial extension loads.
const COLUMNS = [
    'hash', 'number', 'street', 'unit', 'city', 'district', 'region', 'postcode', 'id'
];

// Bounds DuckDB's working memory; the conversion streams so this is ample.
const MEMORY_LIMIT = '2GB';

function quote(value) {
    return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Convert a line-delimited GeoJSON file of Point features (the processed
 * collection output) to a GeoParquet 1.0 file with WKB geometry. GDAL's
 * readers hold the whole file in memory (~15GB per 1.4GB of input), so this
 * uses DuckDB's streaming JSON reader and spatial extension instead - the
 * latter writes the GeoParquet `geo` metadata (bbox, geometry types, CRS).
 */
export async function geojsonToGeoParquet(geojsonPath, parquetPath, { tempDir } = {}) {
    const instance = await DuckDBInstance.create(':memory:');
    const conn = await instance.connect();

    try {
        await conn.run(`SET memory_limit = '${MEMORY_LIMIT}'`);
        if (tempDir) await conn.run(`SET temp_directory = ${quote(tempDir)}`);
        await conn.run('INSTALL spatial');
        await conn.run('LOAD spatial');

        const select = [
            // json_extract_string tolerates a feature missing a key (a typed
            // STRUCT would null out the whole row, and oa_backfill is only
            // present on backfilled records).
            ...COLUMNS.map((c) => `json_extract_string(json, '$.properties.${c}') AS ${c}`),
            "json_extract(json, '$.properties.oa_backfill')::VARCHAR[] AS oa_backfill",
            "ST_GeomFromGeoJSON(json_extract(json, '$.geometry')) AS geometry"
        ].join(', ');

        await conn.run(`
            COPY (
                SELECT ${select}
                FROM read_ndjson_objects(${quote(geojsonPath)})
            ) TO ${quote(parquetPath)} (FORMAT PARQUET, COMPRESSION ZSTD, ROW_GROUP_SIZE 100000)
        `);
    } finally {
        conn.closeSync();
        instance.closeSync();
    }
}
