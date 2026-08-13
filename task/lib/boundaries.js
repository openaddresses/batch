import readline from 'node:readline';
import { Readable } from 'node:stream';
import { bbox as turfBbox, booleanPointInPolygon } from '@turf/turf';

const COUNTRY_PATTERN = /^[a-z]{2}$/;
const DISTRICT_PATTERN = /^(us-\d{5}|au-\d+)$/;

// Coarse spatial index cell size, in degrees. Same grid-bucketing idea as
// lib/dedupe.js, but at a much larger cell size: the indexed polygons are
// regions (states/provinces) and districts (counties/LGAs), which are
// typically 0.05-15deg across. 1deg keeps the number of cells a single
// boundary occupies small (a large state lands in a few hundred cells at
// worst) while shrinking the per-point candidate set from "every polygon
// on earth" (low thousands) to "the few polygons whose bbox overlaps this
// 1deg cell" (usually 1-5).
const INDEX_CELL_SIZE_DEG = 1;

// A boundary whose bbox spans more cells than this is kept in an overflow
// list that every lookup checks, rather than being written into tens of
// thousands of buckets. This only triggers for pathological bboxes (e.g. a
// polygon crossing the antimeridian, whose bbox spans the whole globe), so
// the overflow list stays tiny in practice.
const MAX_CELLS_PER_BOUNDARY = 4096;

function cellKey(lon, lat) {
    return `${Math.floor(lat / INDEX_CELL_SIZE_DEG)}:${Math.floor(lon / INDEX_CELL_SIZE_DEG)}`;
}

/**
 * Classify a `map.code` value into the boundary level it represents. Codes
 * follow the formats produced by scripts/generate-boundaries.py: a bare
 * 2-letter country code, a "cc-subdivision" region code (ISO 3166-2 style),
 * or a "us-FIPS5" / "au-LGAcode" district code.
 */
export function classify(code) {
    if (!code) return 'unknown';
    const lowered = code.toLowerCase();
    if (DISTRICT_PATTERN.test(lowered)) return 'district';
    if (COUNTRY_PATTERN.test(lowered)) return 'country';
    return 'region';
}

/**
 * Add a boundary (by its position in boundaries[level]) to every index cell
 * its bbox overlaps. Because the whole bbox is bucketed, a point contained
 * by the bbox is guaranteed to fall in one of those cells - so lookup only
 * ever has to check the point's own cell, no neighbor search required.
 */
function indexBoundary(index, bbox, idx) {
    const [minX, minY, maxX, maxY] = bbox;

    const minCellX = Math.floor(minX / INDEX_CELL_SIZE_DEG);
    const maxCellX = Math.floor(maxX / INDEX_CELL_SIZE_DEG);
    const minCellY = Math.floor(minY / INDEX_CELL_SIZE_DEG);
    const maxCellY = Math.floor(maxY / INDEX_CELL_SIZE_DEG);

    const cellCount = (maxCellX - minCellX + 1) * (maxCellY - minCellY + 1);
    if (!Number.isFinite(cellCount) || cellCount > MAX_CELLS_PER_BOUNDARY) {
        index.overflow.push(idx);
        return;
    }

    for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
        for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
            const key = `${cellY}:${cellX}`;
            const bucket = index.cells.get(key);
            if (bucket) bucket.push(idx);
            else index.cells.set(key, [idx]);
        }
    }
}

/**
 * readline only accepts a Node Readable. The API client hands back the
 * global fetch()'s `res.body`, which is a WHATWG ReadableStream - passing
 * that straight through throws "input.on is not a function". Callers are
 * expected to convert, but normalize here too so a web stream can never
 * silently disable boundary backfill for a whole run again.
 */
function toNodeStream(stream) {
    if (stream && typeof stream.on === 'function') return stream;
    if (stream && typeof stream.getReader === 'function') return Readable.fromWeb(stream);
    return stream;
}

/**
 * Read line-delimited GeoJSON features (as returned by GET /map/features)
 * and index the region/district ones for point-in-polygon lookup. Country
 * features are read but not indexed - backfill never needs to fill
 * `country`.
 *
 * A single malformed/unusable line is logged and skipped rather than
 * thrown: one bad boundary must not disable backfill for the whole run.
 */
export async function loadBoundaries(stream) {
    const rl = readline.createInterface({ input: toNodeStream(stream), crlfDelay: Infinity });
    const boundaries = {
        region: [],
        district: [],
        index: {
            region: { cells: new Map(), overflow: [] },
            district: { cells: new Map(), overflow: [] }
        }
    };

    let lineNumber = 0;

    for await (const line of rl) {
        lineNumber++;
        if (!line.trim()) continue;

        try {
            const feature = JSON.parse(line);
            const level = classify(feature.properties && feature.properties.code);
            if (level !== 'region' && level !== 'district') continue;

            const bbox = turfBbox(feature);
            // turf returns an all-Infinity bbox (rather than throwing) for a
            // feature with no/empty geometry. Indexing one of those would put
            // a boundary with an unusable geometry in front of every lookup,
            // where booleanPointInPolygon then throws per point.
            if (!bbox.every((v) => Number.isFinite(v))) throw new Error('feature has no usable geometry');

            const idx = boundaries[level].push({
                code: feature.properties.code,
                name: feature.properties.name,
                bbox,
                geometry: feature.geometry
            }) - 1;

            indexBoundary(boundaries.index[level], bbox, idx);
        } catch (err) {
            console.error(`not ok - skipping malformed boundary on line ${lineNumber} (${line.slice(0, 120)}): ${err.message}`);
            continue;
        }
    }

    return boundaries;
}

function contains(boundary, lon, lat) {
    const [minX, minY, maxX, maxY] = boundary.bbox;
    if (lon < minX || lon > maxX || lat < minY || lat > maxY) return false;
    return booleanPointInPolygon([lon, lat], boundary.geometry);
}

/**
 * Find the name of the region/district boundary containing a point, or
 * null if none is loaded/matches. Uses the coarse grid index built by
 * loadBoundaries to reduce the candidate set, then keeps the same
 * bbox-then-exact-point-in-polygon test on those candidates. Falls back to
 * a linear scan for hand-built boundary objects that carry no index.
 */
export function lookup(boundaries, level, lon, lat) {
    const candidates = boundaries[level] || [];
    const index = boundaries.index && boundaries.index[level];

    if (!index) {
        for (const boundary of candidates) {
            if (contains(boundary, lon, lat)) return boundary.name;
        }
        return null;
    }

    const bucket = index.cells.get(cellKey(lon, lat));
    if (bucket) {
        for (const idx of bucket) {
            const boundary = candidates[idx];
            if (contains(boundary, lon, lat)) return boundary.name;
        }
    }

    for (const idx of index.overflow) {
        const boundary = candidates[idx];
        if (contains(boundary, lon, lat)) return boundary.name;
    }

    return null;
}
