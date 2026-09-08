const DEFAULT_CELL_DEG = 0.01;

function cellKey(cellLon, cellLat) {
    return `${cellLon}:${cellLat}`;
}

function toCell(lon, lat, cellDeg) {
    return [Math.floor(lon / cellDeg), Math.floor(lat / cellDeg)];
}

/**
 * Increment a coarse density counter for one feature's coordinate. `counts`
 * is owned by the caller across the whole count pass - sized by the number
 * of populated cells, not by feature count.
 */
export function countCoordinate(counts, lon, lat, cellDeg = DEFAULT_CELL_DEG) {
    const [cellLon, cellLat] = toCell(lon, lat, cellDeg);
    const key = cellKey(cellLon, cellLat);
    counts.set(key, (counts.get(key) || 0) + 1);
}

function boundsOf(cells, cellDeg) {
    let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
    for (const cell of cells) {
        minLon = Math.min(minLon, cell.cellLon);
        maxLon = Math.max(maxLon, cell.cellLon + 1);
        minLat = Math.min(minLat, cell.cellLat);
        maxLat = Math.max(maxLat, cell.cellLat + 1);
    }
    return [minLon * cellDeg, minLat * cellDeg, maxLon * cellDeg, maxLat * cellDeg];
}

function splitQuadrants(cells, bbox) {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    const midLon = (minLon + maxLon) / 2;
    const midLat = (minLat + maxLat) / 2;
    const quads = [
        { bbox: [minLon, minLat, midLon, midLat], cells: [] },
        { bbox: [midLon, minLat, maxLon, midLat], cells: [] },
        { bbox: [minLon, midLat, midLon, maxLat], cells: [] },
        { bbox: [midLon, midLat, maxLon, maxLat], cells: [] }
    ];

    for (const cell of cells) {
        const idx = (cell.lat >= midLat ? 2 : 0) + (cell.lon >= midLon ? 1 : 0);
        quads[idx].cells.push(cell);
    }

    return quads.filter((q) => q.cells.length > 0);
}

function splitRecursive(cells, bbox, budget, floorDeg, out) {
    const total = cells.reduce((sum, c) => sum + c.count, 0);
    const width = bbox[2] - bbox[0];
    const height = bbox[3] - bbox[1];

    if (total <= budget || Math.max(width, height) <= floorDeg) {
        out.push({ bbox, count: total, cells });
        return;
    }

    for (const quad of splitQuadrants(cells, bbox)) {
        splitRecursive(quad.cells, quad.bbox, budget, floorDeg, out);
    }
}

/**
 * Recursively split the populated area of `counts` into density-balanced
 * tiles, each at or under `budget` features - unless a tile has hit
 * `floorDeg` and still exceeds budget (see the per-shard safety valve in
 * collect.js). Only populated cells are ever visited, so cost scales with
 * the number of distinct populated cells, not the collection's degree span.
 *
 * `cellToTile` maps every populated base cell to its owning tile index,
 * doubling as the point -> home-tile lookup `assignTiles` uses.
 */
export function buildTiles(counts, { budget, cellDeg = DEFAULT_CELL_DEG, floorDeg = cellDeg } = {}) {
    if (counts.size === 0) return { tiles: [], cellToTile: new Map() };

    const cells = [];
    for (const [key, count] of counts) {
        const [cellLon, cellLat] = key.split(':').map(Number);
        cells.push({ cellLon, cellLat, lon: cellLon * cellDeg, lat: cellLat * cellDeg, count, key });
    }

    const bbox = boundsOf(cells, cellDeg);
    const out = [];
    splitRecursive(cells, bbox, budget, floorDeg, out);

    const cellToTile = new Map();
    out.forEach((tile, idx) => {
        for (const cell of tile.cells) cellToTile.set(cell.key, idx);
    });

    return {
        tiles: out.map(({ bbox, count }) => ({ bbox, count })),
        cellToTile
    };
}

export { DEFAULT_CELL_DEG };
