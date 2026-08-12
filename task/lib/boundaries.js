import readline from 'node:readline';
import { bbox as turfBbox, booleanPointInPolygon } from '@turf/turf';

const COUNTRY_PATTERN = /^[a-z]{2}$/;
const DISTRICT_PATTERN = /^(us-\d{5}|au-\d+)$/;

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
 * Read line-delimited GeoJSON features (as returned by GET /map/features)
 * and index the region/district ones for point-in-polygon lookup. Country
 * features are read but not indexed - backfill never needs to fill
 * `country`.
 */
export async function loadBoundaries(stream) {
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    const boundaries = { region: [], district: [] };

    for await (const line of rl) {
        if (!line.trim()) continue;

        const feature = JSON.parse(line);
        const level = classify(feature.properties && feature.properties.code);
        if (level !== 'region' && level !== 'district') continue;

        boundaries[level].push({
            code: feature.properties.code,
            name: feature.properties.name,
            bbox: turfBbox(feature),
            geometry: feature.geometry
        });
    }

    return boundaries;
}

/**
 * Find the name of the region/district boundary containing a point, or
 * null if none is loaded/matches. Filters by bounding box first since the
 * boundary set is small (low thousands of polygons) but per-point exact
 * polygon tests are more expensive.
 */
export function lookup(boundaries, level, lon, lat) {
    const candidates = boundaries[level] || [];

    for (const boundary of candidates) {
        const [minX, minY, maxX, maxY] = boundary.bbox;
        if (lon < minX || lon > maxX || lat < minY || lat > maxY) continue;
        if (booleanPointInPolygon([lon, lat], boundary.geometry)) return boundary.name;
    }

    return null;
}
