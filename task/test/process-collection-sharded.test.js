import test from 'tape';
import { countCoordinate, buildTiles, assignTiles, DEFAULT_CELL_DEG } from '../lib/tiling.js';
import { buildShardFeatures } from '../lib/process-shard.js';

function feature(props, coords) {
    return { type: 'Feature', properties: props, geometry: { type: 'Point', coordinates: coords } };
}

test('a duplicate pair split across two tiles collapses to exactly one emitted feature', (t) => {
    // Two records ~5m apart (well within match range) placed to land in
    // different tiles once a tiny budget forces a split near that point.
    const records = [
        { path: 'us/ca/statewide.json', coords: [0.00100, 0.00100], props: { number: '10', street: 'Elm Rd', region: '' } },
        { path: 'us/ca/oakland.json', coords: [0.00105, 0.00105], props: { number: '10', street: 'Elm Road', region: 'CA' } },
        // A distant, unrelated record forces buildTiles to actually split.
        { path: 'us/ny/nyc.json', coords: [50, 50], props: { number: '99', street: 'Far Ave', region: 'NY' } }
    ];

    const counts = new Map();
    for (const r of records) countCoordinate(counts, r.coords[0], r.coords[1], DEFAULT_CELL_DEG);
    const { tiles, cellToTile } = buildTiles(counts, { budget: 1, cellDeg: DEFAULT_CELL_DEG, floorDeg: DEFAULT_CELL_DEG });

    t.ok(tiles.length >= 2, 'the distant record forces at least two tiles');

    // Assign every record to its home + borrowed tiles.
    const coreByTile = tiles.map(() => new Map());
    const borrowedByTile = tiles.map(() => new Map());
    for (const r of records) {
        const { home, borrowed } = assignTiles(cellToTile, DEFAULT_CELL_DEG, r.coords[0], r.coords[1]);
        const f = feature(r.props, r.coords);
        if (!coreByTile[home].has(r.path)) coreByTile[home].set(r.path, []);
        coreByTile[home].get(r.path).push(f);
        for (const b of borrowed) {
            if (!borrowedByTile[b].has(r.path)) borrowedByTile[b].set(r.path, []);
            borrowedByTile[b].get(r.path).push(f);
        }
    }

    // Process every tile and concatenate, exactly as collect.js's shard loop does.
    const emitted = [];
    for (let idx = 0; idx < tiles.length; idx++) {
        emitted.push(...buildShardFeatures(coreByTile[idx], borrowedByTile[idx], { region: [], district: [] }));
    }

    const nearby = emitted.filter((f) => f.properties.number === '10');
    t.equals(nearby.length, 1, 'the near-duplicate pair is emitted exactly once total, however many tiles it spans');
    t.equals(emitted.length, 2, 'the unrelated distant record is also emitted, giving two features overall');
    t.end();
});
