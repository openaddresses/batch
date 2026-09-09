import test from 'node:test';
import assert from 'assert';
import Flight from './flight.js';
import { sql } from 'slonik';

const flight = new Flight();

flight.init();
flight.takeoff();

test('Populate Map', async () => {
    try {
        await flight.config.pool.query(sql`
            INSERT INTO map (
                name,
                code,
                geom
            ) VALUES (
                'United States',
                'us',
                ST_GeomFromGeoJSON('{ "type": "Polygon", "coordinates": [ [ [ -110, 34 ], [ -94, 34 ], [ -94, 46 ], [ -110, 46 ], [ -110, 34 ] ] ] }')
            );
        `);

        await flight.config.pool.query(sql`
            INSERT INTO map (
                name,
                code,
                geom
            ) VALUES (
                'Canada',
                'ca',
                ST_GeomFromGeoJSON('{ "type": "Polygon", "coordinates": [ [ [ -128, 54 ], [ -101, 54 ], [ -101, 63 ], [ -128, 63 ], [ -128, 54 ] ] ] }')
            );
        `);

        await flight.config.pool.query(sql`
            WITH coverage (code, layer) AS (
                VALUES
                    ('us', 'addresses'),
                    ('us', 'parcels'),
                    ('ca', 'buildings'),
                    ('ca', 'centerlines')
            ), inserted_jobs AS (
                INSERT INTO job (
                    map,
                    source_name,
                    layer,
                    name
                )
                SELECT
                    map.id,
                    'test/' || coverage.code,
                    coverage.layer,
                    'test'
                FROM
                    coverage
                    INNER JOIN map ON map.code = coverage.code
                RETURNING
                    id,
                    source_name,
                    layer,
                    name
            )
            INSERT INTO results (
                source,
                layer,
                name,
                job
            )
            SELECT
                source_name,
                layer,
                name,
                id
            FROM
                inserted_jobs;
        `);
    } catch (err) {
        assert.ifError(err);
    }
});

test('GET: api/map/features', async () => {
    try {
        const res = await flight.fetch('/api/map/features', {
            method: 'GET'
        }, {
            verify: false,
            json: false
        });

        const features = res.body.trim().split('\n').map(JSON.parse)
            .sort((a, b) => a.properties.code.localeCompare(b.properties.code));

        assert.deepEqual(features, [{
            id: 2,
            type: 'Feature',
            properties: {
                id: 2,
                name: 'Canada',
                code: 'ca',
                addresses: false,
                buildings: true,
                parcels: false,
                centerlines: true
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [-128, 54],
                    [-101, 54],
                    [-101, 63],
                    [-128, 63],
                    [-128, 54]
                ]]
            }
        }, {
            id: 1,
            type: 'Feature',
            properties: {
                id: 1,
                name: 'United States',
                code: 'us',
                addresses: true,
                buildings: false,
                parcels: true,
                centerlines: false
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [-110, 34],
                    [-94, 34],
                    [-94, 46],
                    [-110, 46],
                    [-110, 34]
                ]]
            }
        }]);
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

flight.landing();
