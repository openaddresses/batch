import test from 'tape';
import { badGeometry, MAX_POLYGON_EXTENT_DEG } from '../lib/extent.js';

// Shape of the two us/wa/statewide parcels that stalled a fabric shard for
// 57 hours: a world-sized outer ring with the real parcel as a hole.
const worldWithHole = {
    type: 'Polygon',
    coordinates: [
        [[-180, -90], [-180, 90], [180, 90], [180, -90], [-180, -90]],
        [[-117.89, 47.55], [-117.88, 47.55], [-117.88, 47.56], [-117.89, 47.56], [-117.89, 47.55]]
    ]
};

const parcel = { type: 'Polygon', coordinates: [[[-117.89, 47.55], [-117.88, 47.55], [-117.88, 47.56], [-117.89, 47.55]]] };

test('badGeometry reports a world-sized polygon with a parcel-sized hole as oversized', (t) => {
    t.equals(badGeometry(worldWithHole), 'oversized');
    t.end();
});

test('badGeometry reports coordinates outside longitude/latitude range', (t) => {
    // us/md/howard: Maryland State Plane feet written as lon/lat
    const projected = { type: 'Polygon', coordinates: [[[1282935.53, 619538.58], [1282766.56, 619440.37], [1282800, 619500], [1282935.53, 619538.58]]] };

    t.equals(badGeometry(projected), 'out-of-range');
    t.equals(badGeometry({ type: 'MultiPolygon', coordinates: [parcel.coordinates, projected.coordinates] }), 'out-of-range');
    t.equals(badGeometry({ type: 'Point', coordinates: [1282935.53, 619538.58] }), 'out-of-range');
    t.equals(badGeometry({ type: 'LineString', coordinates: [[-117, 47], [-117.5, 91]] }), 'out-of-range', 'latitude past 90');
    t.equals(badGeometry({ type: 'Point', coordinates: [NaN, 47] }), 'out-of-range');
    t.end();
});

test('badGeometry keeps ordinary parcels and the large legitimate ones seen in production', (t) => {
    // Alaska North Slope wilderness parcel: 13.3 degrees of longitude at 68N
    const alaska = { type: 'Polygon', coordinates: [[[-162.8, 68.0], [-149.5, 68.0], [-149.5, 68.7], [-162.8, 68.0]]] };
    // Svalbard: 11 degrees wide, 3 tall, at 78N
    const svalbard = { type: 'Polygon', coordinates: [[[9.4, 78.0], [20.4, 78.0], [20.4, 81.0], [9.4, 78.0]]] };

    t.equals(badGeometry(parcel), null);
    t.equals(badGeometry(alaska), null);
    t.equals(badGeometry(svalbard), null);
    t.equals(badGeometry({ type: 'Point', coordinates: [-117.89, 47.55] }), null);
    t.equals(badGeometry({ type: 'Point', coordinates: [180, -90] }), null, 'the exact edges are in range');
    t.end();
});

test('badGeometry judges each polygon of a MultiPolygon on its own', (t) => {
    // Aleutian-style parcel on both sides of the antimeridian: the feature
    // spans 358 degrees of longitude but no single part is big
    const eastPart = [[[179.5, 51.0], [179.9, 51.0], [179.9, 51.2], [179.5, 51.0]]];
    const westPart = [[[-179.9, 51.0], [-179.5, 51.0], [-179.5, 51.2], [-179.9, 51.0]]];
    const hugePart = [[[0, 0], [30, 0], [30, 1], [0, 0]]];

    t.equals(badGeometry({ type: 'MultiPolygon', coordinates: [eastPart, westPart] }), null);
    t.equals(badGeometry({ type: 'MultiPolygon', coordinates: [eastPart, hugePart] }), 'oversized');
    t.end();
});

test('badGeometry does not size-check points and lines', (t) => {
    t.equals(badGeometry({ type: 'LineString', coordinates: [[-117, 47], [-80, 40]] }), null, 'a long centerline is legitimate');
    t.equals(badGeometry(null), null);
    t.equals(badGeometry(undefined), null);
    t.equals(badGeometry({ type: 'Point' }), null);
    t.end();
});

test('badGeometry honors an explicit limit and defaults to MAX_POLYGON_EXTENT_DEG', (t) => {
    const twentyFive = { type: 'Polygon', coordinates: [[[0, 0], [25, 0], [25, 1], [0, 0]]] };

    t.equals(MAX_POLYGON_EXTENT_DEG, 20);
    t.equals(badGeometry(twentyFive), 'oversized');
    t.equals(badGeometry(twentyFive, 30), null);
    t.end();
});
