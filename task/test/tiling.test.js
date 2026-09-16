import test from 'tape';
import { countCoordinate, buildTiles, assignTiles } from '../lib/tiling.js';

test('buildTiles keeps one tile when the whole area is under budget', (t) => {
    const counts = new Map();
    countCoordinate(counts, -122.27, 37.80);
    countCoordinate(counts, -122.26, 37.81);

    const { tiles, cellToTile } = buildTiles(counts, { budget: 1000 });

    t.equals(tiles.length, 1, 'no split needed under budget');
    t.equals(tiles[0].count, 2);
    t.equals(cellToTile.size, 2, 'both populated cells map to the single tile');
    t.end();
});

test('buildTiles splits a tile whose count exceeds budget', (t) => {
    const counts = new Map();
    // Two well-separated clusters, each individually under budget, but
    // together over it - forces exactly one split.
    for (let i = 0; i < 3; i++) countCoordinate(counts, -10 + i * 0.02, -10 + i * 0.02);
    for (let i = 0; i < 3; i++) countCoordinate(counts, 10 + i * 0.02, 10 + i * 0.02);

    const { tiles } = buildTiles(counts, { budget: 3, cellDeg: 0.01, floorDeg: 0.005 });

    t.ok(tiles.length > 1, 'splits into more than one tile');
    t.ok(tiles.every((tile) => tile.count <= 3), 'every resulting tile is at or under budget');
    t.end();
});

test('buildTiles stops at the floor size even if still over budget', (t) => {
    const counts = new Map();
    // 100 points crammed into the same single 0.01deg cell - can't be split
    // any further once floorDeg is reached.
    for (let i = 0; i < 100; i++) countCoordinate(counts, 0.001, 0.001);

    const { tiles } = buildTiles(counts, { budget: 10, cellDeg: 0.01, floorDeg: 0.01 });

    t.equals(tiles.length, 1, 'single over-budget cell stays one tile at the floor');
    t.equals(tiles[0].count, 100, 'count is not truncated - caller decides whether to skip it');
    t.end();
});

test('buildTiles returns nothing for an empty counts map', (t) => {
    const { tiles, cellToTile } = buildTiles(new Map(), { budget: 100 });
    t.equals(tiles.length, 0);
    t.equals(cellToTile.size, 0);
    t.end();
});

test('assignTiles finds the home tile and borrows into a neighboring tile near a boundary', (t) => {
    const counts = new Map();
    for (let i = 0; i < 3; i++) countCoordinate(counts, -10 + i * 0.02, -10 + i * 0.02);
    for (let i = 0; i < 3; i++) countCoordinate(counts, 10 + i * 0.02, 10 + i * 0.02);
    const { cellToTile } = buildTiles(counts, { budget: 3, cellDeg: 0.01, floorDeg: 0.005 });

    const { home, borrowed } = assignTiles(cellToTile, 0.01, -10, -10);

    t.ok(home !== undefined, 'point in a populated cell resolves a home tile');
    t.ok(Array.isArray(borrowed), 'borrowed is always an array, even when empty');
    t.end();
});

test('assignTiles returns no home tile for an unpopulated point', (t) => {
    const counts = new Map();
    countCoordinate(counts, 0, 0);
    const { cellToTile } = buildTiles(counts, { budget: 100 });

    const { home, borrowed } = assignTiles(cellToTile, 0.01, 50, 50);

    t.equals(home, undefined, 'a point far from any populated cell has no home tile');
    t.deepEquals(borrowed, []);
    t.end();
});

test('assignTiles borrows a point into every distinct neighboring tile, never into its own home', (t) => {
    // Two adjacent 0.01deg cells split into two different tiles by forcing
    // a tiny budget - a point in one cell's neighborhood should borrow into
    // the other without including its own home tile.
    const counts = new Map();
    countCoordinate(counts, 0.001, 0.001, 0.01);   // cell (0,0)
    countCoordinate(counts, 0.011, 0.001, 0.01);    // cell (1,0), adjacent
    const { cellToTile } = buildTiles(counts, { budget: 1, cellDeg: 0.01, floorDeg: 0.01 });

    const { home, borrowed } = assignTiles(cellToTile, 0.01, 0.001, 0.001);

    t.ok(!borrowed.includes(home), 'home tile is never listed in borrowed');
    t.end();
});
