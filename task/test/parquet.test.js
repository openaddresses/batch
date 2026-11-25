import test from 'tape';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DuckDBInstance } from '@duckdb/node-api';
import { geojsonToGeoParquet } from '../lib/parquet.js';

test('geojsonToGeoParquet writes GeoParquet with geo metadata', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'parquet-test-'));
    const src = path.join(dir, 'in.geojson');
    const dst = path.join(dir, 'out.parquet');

    const features = [
        { type: 'Feature', properties: { hash: 'a', number: '1', street: 'Main', unit: '', city: 'X', district: '', region: 'NY', postcode: '1', id: '' }, geometry: { type: 'Point', coordinates: [-74.5, 40.5] } },
        { type: 'Feature', properties: { hash: 'b', number: '2', street: 'Main', unit: '', city: '', district: '', region: 'NY', postcode: '', id: '', oa_backfill: ['region'] }, geometry: { type: 'Point', coordinates: [-73.5, 41.5] } }
    ];
    fs.writeFileSync(src, features.map((f) => JSON.stringify(f)).join('\n') + '\n');

    try {
        await geojsonToGeoParquet(src, dst);

        const instance = await DuckDBInstance.create(':memory:');
        const conn = await instance.connect();
        await conn.run('INSTALL spatial; LOAD spatial');

        const rows = (await conn.runAndReadAll(`SELECT hash, region, oa_backfill, ST_X(geometry) AS x FROM read_parquet('${dst}') ORDER BY hash`)).getRowObjectsJson();
        t.equal(rows.length, 2, 'two rows');
        t.equal(rows[0].x, -74.5, 'geometry round-trips');
        t.deepEqual(rows[1].oa_backfill, ['region'], 'oa_backfill kept');
        t.equal(rows[0].oa_backfill, null, 'oa_backfill null when absent');

        const kv = (await conn.runAndReadAll(`SELECT decode(value) AS v FROM parquet_kv_metadata('${dst}') WHERE decode(key) = 'geo'`)).getRowObjectsJson();
        const geo = JSON.parse(kv[0].v);
        t.equal(geo.primary_column, 'geometry', 'geo metadata primary column');
        t.equal(geo.columns.geometry.encoding, 'WKB', 'WKB encoding');
        t.deepEqual(geo.columns.geometry.bbox, [-74.5, 40.5, -73.5, 41.5], 'bbox');

        conn.closeSync();
        instance.closeSync();
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
