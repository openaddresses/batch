// Geometry that should never reach tippecanoe, found while debugging the
// parcels fabric job (2026-10-19 to 2026-10-27).
//
// Oversized: us/wa/statewide has two parcels whose outer ring is the whole
// world rectangle (-180,-90 to 180,90) with the real parcel as a hole in it.
// tippecanoe has to emit a filled tile for every tile on Earth at z13-14 for
// each of them, which stalled one parcels shard for 57 hours while the other
// 15 finished in under 5. Legitimate large polygons are far smaller: the
// biggest seen are Alaska and Svalbard wilderness parcels at 8 to 13 degrees
// of longitude (short at latitudes of 68 to 79 degrees), so the limit is
// measured per polygon, not per feature: a MultiPolygon on both sides of the
// antimeridian is fine as long as each part is small.
//
// Out of range: us/md/howard publishes 94,555 parcels whose coordinates are
// Maryland State Plane feet (x 1,282,935, y 619,538) written as if they were
// longitude and latitude. They can never be tiled.
export const MAX_POLYGON_EXTENT_DEG = 20;

function newExtent() {
    return { minLon: Infinity, maxLon: -Infinity, minLat: Infinity, maxLat: -Infinity, outOfRange: false };
}

function collect(coords, extent) {
    if (!Array.isArray(coords)) return;

    if (typeof coords[0] === 'number') {
        const lon = coords[0];
        const lat = coords[1];

        // written so that NaN also counts as out of range
        if (!(Math.abs(lon) <= 180 && Math.abs(lat) <= 90)) extent.outOfRange = true;

        extent.minLon = Math.min(extent.minLon, lon);
        extent.maxLon = Math.max(extent.maxLon, lon);
        extent.minLat = Math.min(extent.minLat, lat);
        extent.maxLat = Math.max(extent.maxLat, lat);
        return;
    }

    for (const part of coords) collect(part, extent);
}

function exceeds(extent, maxDeg) {
    return (extent.maxLon - extent.minLon) > maxDeg || (extent.maxLat - extent.minLat) > maxDeg;
}

/**
 * Why a geometry should be dropped before tiling, or null if it is fine.
 *
 * - 'out-of-range': any coordinate outside longitude -180..180 or
 *   latitude -90..90, e.g. projected coordinates mislabeled as lon/lat
 * - 'oversized': a Polygon, or any one polygon of a MultiPolygon, whose
 *   bounding box is wider or taller than `maxDeg` degrees
 *
 * Points and lines are only checked for range: a single long centerline (a
 * highway across several states) is legitimate, and costs only the tiles
 * along its path, not every tile inside its bounding box.
 */
export function badGeometry(geometry, maxDeg = MAX_POLYGON_EXTENT_DEG) {
    if (!geometry || !Array.isArray(geometry.coordinates)) return null;

    const whole = newExtent();
    collect(geometry.coordinates, whole);
    if (whole.outOfRange) return 'out-of-range';

    if (geometry.type === 'Polygon') {
        return exceeds(whole, maxDeg) ? 'oversized' : null;
    }

    if (geometry.type === 'MultiPolygon') {
        for (const polygon of geometry.coordinates) {
            const part = newExtent();
            collect(polygon, part);
            if (exceeds(part, maxDeg)) return 'oversized';
        }
    }

    return null;
}
