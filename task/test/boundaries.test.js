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

function ndjson(features) {
    return features.map((f) => JSON.stringify(f) + '\n');
}

function ndjsonStream(features) {
    return Readable.from(ndjson(features));
}

// Mirrors what oa.cmd(..., { stream: true }) actually hands back: the global
// fetch()'s res.body, a WHATWG ReadableStream rather than a Node Readable.
function ndjsonWebStream(features) {
    return Readable.toWeb(Readable.from(ndjson(features).map((line) => Buffer.from(line))));
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

test('loadBoundaries accepts a WHATWG ReadableStream, not just a Node Readable', async (t) => {
    // collect.js feeds this from oa.cmd('map', 'features', {}, { stream: true }),
    // which resolves to fetch()'s res.body - a web stream. readline requires a
    // Node stream, so an unconverted web stream used to throw
    // "input.on is not a function", which was swallowed by the caller's
    // try/catch and silently disabled region/district backfill for every run.
    const boundaries = await loadBoundaries(ndjsonWebStream([
        { type: 'Feature', properties: { code: 'us-ca', name: 'California' }, geometry: CALIFORNIA_SQUARE },
        { type: 'Feature', properties: { code: 'us-06001', name: 'Alameda County' }, geometry: CALIFORNIA_SQUARE }
    ]));

    t.equals(boundaries.region.length, 1, 'region boundary loaded from a web stream');
    t.equals(boundaries.district.length, 1, 'district boundary loaded from a web stream');
    t.equals(lookup(boundaries, 'region', -122, 38), 'California', 'boundaries loaded from a web stream are queryable');
    t.end();
});

test('loadBoundaries skips a malformed line instead of failing the whole load', async (t) => {
    const stream = Readable.from([
        JSON.stringify({ type: 'Feature', properties: { code: 'us-ca', name: 'California' }, geometry: CALIFORNIA_SQUARE }) + '\n',
        '{"type": "Feature", "properties": {"code": "us-ny", "name": "New Yo\n',
        JSON.stringify({ type: 'Feature', properties: { code: 'us-06001', name: 'Alameda County' }, geometry: CALIFORNIA_SQUARE }) + '\n'
    ]);

    const logs = [];
    const original = console.error;
    console.error = (msg) => logs.push(msg);

    let boundaries;
    try {
        boundaries = await loadBoundaries(stream);
    } finally {
        console.error = original;
    }

    t.equals(boundaries.region.length, 1, 'the good region before the bad line is kept');
    t.equals(boundaries.district.length, 1, 'the good district after the bad line is still read');
    t.equals(logs.length, 1, 'exactly one warning is logged');
    t.ok(/line 2/.test(logs[0]), `warning identifies the offending line: ${logs[0]}`);
    t.end();
});

test('loadBoundaries skips a feature with unusable geometry instead of throwing', async (t) => {
    const stream = ndjsonStream([
        { type: 'Feature', properties: { code: 'us-ca', name: 'California' }, geometry: null },
        { type: 'Feature', properties: { code: 'us-ny', name: 'New York' }, geometry: CALIFORNIA_SQUARE }
    ]);

    const logs = [];
    const original = console.error;
    console.error = (msg) => logs.push(msg);

    let boundaries;
    try {
        boundaries = await loadBoundaries(stream);
    } finally {
        console.error = original;
    }

    t.equals(boundaries.region.length, 1, 'only the usable region survives');
    t.equals(boundaries.region[0].name, 'New York');
    t.equals(logs.length, 1, 'the unusable feature is logged once');
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

test('lookup still works on a hand-built boundary object with no index', async (t) => {
    // lib/backfill.js callers (and its tests) build these literally.
    const boundaries = {
        region: [{ code: 'us-ca', name: 'California', bbox: [-123, 37, -121, 39], geometry: CALIFORNIA_SQUARE }],
        district: []
    };

    t.equals(lookup(boundaries, 'region', -122, 38), 'California', 'falls back to a linear scan without an index');
    t.equals(lookup(boundaries, 'region', 10, 10), null);
    t.end();
});

function square(minX, minY, size) {
    return {
        type: 'Polygon',
        coordinates: [[
            [minX, minY], [minX + size, minY], [minX + size, minY + size], [minX, minY + size], [minX, minY]
        ]]
    };
}

test('loadBoundaries builds a spatial index so lookup does not scan every polygon', async (t) => {
    // 400 disjoint 0.5deg squares laid out on a 20x20 grid of whole degrees.
    const features = [];
    for (let x = 0; x < 20; x++) {
        for (let y = 0; y < 20; y++) {
            features.push({
                type: 'Feature',
                properties: { code: `zz-${x}-${y}`, name: `Region ${x}-${y}` },
                geometry: square(x, y, 0.5)
            });
        }
    }

    const boundaries = await loadBoundaries(ndjsonStream(features));

    t.equals(boundaries.region.length, 400, 'all 400 boundaries are loaded');
    t.equals(boundaries.index.region.overflow.length, 0, 'no boundary is big enough to need the overflow list');

    const bucket = boundaries.index.region.cells.get('7:3');
    t.equals(bucket.length, 1, 'a point lookup only has 1 of the 400 polygons as a candidate');

    t.equals(lookup(boundaries, 'region', 3.25, 7.25), 'Region 3-7', 'indexed lookup still finds the containing polygon');
    t.equals(lookup(boundaries, 'region', 3.75, 7.75), null, 'a point inside the cell but outside the polygon still fails the exact test');
    t.equals(lookup(boundaries, 'region', 50, 50), null, 'a point in an empty cell returns null');
    t.end();
});

test('loadBoundaries indexes a boundary spanning many cells into all of them', async (t) => {
    const boundaries = await loadBoundaries(ndjsonStream([
        { type: 'Feature', properties: { code: 'us-tx', name: 'Texas' }, geometry: square(-106, 26, 13) }
    ]));

    t.equals(boundaries.index.region.cells.size, 14 * 14, 'a 13deg-wide bbox occupies every 1deg cell it touches');
    t.equals(lookup(boundaries, 'region', -100, 30), 'Texas', 'a point deep inside a multi-cell boundary resolves');
    t.equals(lookup(boundaries, 'region', -105.5, 26.5), 'Texas', 'so does a point in the boundary\'s first cell');
    t.equals(lookup(boundaries, 'region', -93.5, 38.5), 'Texas', 'and one in its last cell');
    t.end();
});

test('loadBoundaries puts a boundary whose bbox spans too many cells in the overflow list, and lookup still finds it', async (t) => {
    // MAX_CELLS_PER_BOUNDARY is 4096 with a 1deg index cell size, i.e. a
    // 64x64 grid of cells. A 70deg-wide square bbox occupies 71x71 = 5041
    // cells - comfortably over the threshold - so this boundary must be
    // routed to index.overflow instead of being bucketed per-cell.
    const boundaries = await loadBoundaries(ndjsonStream([
        { type: 'Feature', properties: { code: 'zz-huge', name: 'Huge Region' }, geometry: square(-40, -40, 70) }
    ]));

    t.equals(boundaries.region.length, 1, 'the oversized boundary is still loaded');
    t.equals(boundaries.index.region.overflow.length, 1, 'the oversized boundary is routed to the overflow list');
    t.equals(boundaries.index.region.cells.size, 0, 'it is not bucketed into any per-cell entries');

    t.equals(lookup(boundaries, 'region', -5, -5), 'Huge Region', 'lookup consults the overflow list and finds a point inside the oversized polygon');
    t.equals(lookup(boundaries, 'region', 50, 50), null, 'a point outside the oversized polygon (and its cell empty) still returns null');
    t.end();
});
