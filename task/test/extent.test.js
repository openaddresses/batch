import test from 'tape';
import { exceedsMaxExtent, MAX_POLYGON_EXTENT_DEG } from '../lib/extent.js';

// Shape of the two us/wa/statewide parcels that stalled a fabric shard for
// 57 hours: a world-sized outer ring with the real parcel as a hole.
const worldWithHole = {
    type: 'Polygon',
    coordinates: [
        [[-180, -90], [-180, 90], [180, 90], [180, -90], [-180, -90]],
        [[-117.89, 47.55], [-117.88, 47.55], [-117.88, 47.56], [-117.89, 47.56], [-117.89, 47.55]]
    ]
};

test('exceedsMaxExtent reports a world-sized polygon with a parcel-sized hole', (t) => {
    t.equals(exceedsMaxExtent(worldWithHole), true);
    t.end();
});

test('exceedsMaxExtent keeps an ordinary parcel and a large legitimate one', (t) => {
    const parcel = { type: 'Polygon', coordinates: [[[-117.89, 47.55], [-117.88, 47.55], [-117.88, 47.56], [-117.89, 47.55]]] };
    // the biggest real polygon in us/wa/statewide is a little over 1 degree across
    const large = { type: 'Polygon', coordinates: [[[-121, 47], [-119.9, 47], [-119.9, 48.1], [-121, 47]]] };

    t.equals(exceedsMaxExtent(parcel), false);
    t.equals(exceedsMaxExtent(large), false);
    t.end();
});

test('exceedsMaxExtent checks every part of a MultiPolygon', (t) => {
    const nearby = [[[-117.89, 47.55], [-117.88, 47.55], [-117.88, 47.56], [-117.89, 47.55]]];
    const far = [[[-70, 42], [-70.01, 42], [-70.01, 42.01], [-70, 42]]];

    t.equals(exceedsMaxExtent({ type: 'MultiPolygon', coordinates: [nearby, nearby] }), false);
    t.equals(exceedsMaxExtent({ type: 'MultiPolygon', coordinates: [nearby, far] }), true, 'parts about 47 degrees apart');
    t.end();
});

test('exceedsMaxExtent only judges polygons', (t) => {
    t.equals(exceedsMaxExtent({ type: 'Point', coordinates: [-117.89, 47.55] }), false);
    t.equals(exceedsMaxExtent({ type: 'LineString', coordinates: [[-117, 47], [-80, 40]] }), false, 'a long centerline is legitimate');
    t.equals(exceedsMaxExtent(null), false);
    t.equals(exceedsMaxExtent(undefined), false);
    t.end();
});

test('exceedsMaxExtent honors an explicit limit and defaults to MAX_POLYGON_EXTENT_DEG', (t) => {
    const twoDegrees = { type: 'Polygon', coordinates: [[[0, 0], [2, 0], [2, 1], [0, 0]]] };

    t.equals(MAX_POLYGON_EXTENT_DEG, 5);
    t.equals(exceedsMaxExtent(twoDegrees), false);
    t.equals(exceedsMaxExtent(twoDegrees, 1), true);
    t.end();
});
