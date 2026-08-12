import test from 'tape';
import { Readable } from 'node:stream';
import { classify, loadBoundaries, lookup } from '../lib/boundaries.js';

test('classify identifies boundary level from map code format', (t) => {
    t.equals(classify('us'), 'country');
    t.equals(classify('nl'), 'country');
    t.equals(classify('us-ca'), 'region');
    t.equals(classify('gb-eng'), 'region');
    t.equals(classify('us-06001'), 'district');
    t.equals(classify('au-10050'), 'district');
    t.end();
});

const CALIFORNIA_SQUARE = {
    type: 'Polygon',
    coordinates: [[[-123, 37], [-121, 37], [-121, 39], [-123, 39], [-123, 37]]]
};

function ndjsonStream(features) {
    return Readable.from(features.map((f) => JSON.stringify(f) + '\n'));
}

test('loadBoundaries keeps only region/district features, indexed by level', async (t) => {
    const stream = ndjsonStream([
        { type: 'Feature', properties: { code: 'us', name: 'United States' }, geometry: CALIFORNIA_SQUARE },
        { type: 'Feature', properties: { code: 'us-ca', name: 'California' }, geometry: CALIFORNIA_SQUARE },
        { type: 'Feature', properties: { code: 'us-06001', name: 'Alameda County' }, geometry: CALIFORNIA_SQUARE }
    ]);

    const boundaries = await loadBoundaries(stream);

    t.equals(boundaries.region.length, 1, 'only the region-level feature is kept in region[]');
    t.equals(boundaries.region[0].name, 'California');
    t.equals(boundaries.district.length, 1, 'only the district-level feature is kept in district[]');
    t.equals(boundaries.district[0].name, 'Alameda County');
    t.end();
});

test('lookup returns the containing boundary name, or null outside all boundaries', async (t) => {
    const stream = ndjsonStream([
        { type: 'Feature', properties: { code: 'us-ca', name: 'California' }, geometry: CALIFORNIA_SQUARE }
    ]);
    const boundaries = await loadBoundaries(stream);

    t.equals(lookup(boundaries, 'region', -122, 38), 'California', 'point inside the polygon resolves');
    t.equals(lookup(boundaries, 'region', 10, 10), null, 'point outside every boundary returns null');
    t.equals(lookup(boundaries, 'district', -122, 38), null, 'no district boundaries loaded, so district lookup is always null');
    t.end();
});
