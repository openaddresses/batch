import test from 'tape';
import Flight from './flight.js';
import { sql } from 'slonik';

const flight = new Flight();

flight.init(test);
flight.takeoff(test);

test('Populate Map', async (t) => {
    try {
        await flight.config.pool.query(sql`
            INSERT INTO map (
                name,
                code,
                geom
            ) VALUES (
                'United States',
                'us',
                ST_GeomFromGeoJSON('{ "type": "Polygon", "coordinates": [ [ [ -110.0390625, 34.30714385628804 ], [ -94.21875, 34.30714385628804 ], [ -94.21875, 46.07323062540835 ], [ -110.0390625, 46.07323062540835 ], [ -110.0390625, 34.30714385628804 ] ] ] }')
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
                ST_GeomFromGeoJSON('{ "type": "Polygon", "coordinates": [ [ [ -128.32031249999997, 53.9560855309879 ], [ -100.8984375, 53.9560855309879 ], [ -100.8984375, 63.074865690586634 ], [ -128.32031249999997, 63.074865690586634 ], [ -128.32031249999997, 53.9560855309879 ] ] ] }')
            );
        `);
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('GET: api/map/features', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/map/features',
            method: 'GET'
        }, false);

        t.equals(res.body.split('\n').length, 3);
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

flight.landing(test);
