// A parcel or building is never this wide. A polygon whose bounding box is
// wider or taller than this is a broken geometry, not a feature worth
// tiling: us/wa/statewide has two parcels whose outer ring is the whole-world
// rectangle (-180,-90 to 180,90) with the real parcel as a hole in it.
// tippecanoe has to emit a filled tile for every tile on Earth at z13-14 for
// each of them, which stalled one parcels shard for 57 hours (2026-10-20 to
// 2026-10-22) while the other 15 shards finished in under 5. The largest
// legitimate polygon in that 3.3M-feature file has a bounding box about
// 1.1 degrees across.
export const MAX_POLYGON_EXTENT_DEG = 5;

function collectExtent(coords, extent) {
    if (!Array.isArray(coords)) return;

    if (typeof coords[0] === 'number') {
        extent.minLon = Math.min(extent.minLon, coords[0]);
        extent.maxLon = Math.max(extent.maxLon, coords[0]);
        extent.minLat = Math.min(extent.minLat, coords[1]);
        extent.maxLat = Math.max(extent.maxLat, coords[1]);
        return;
    }

    for (const part of coords) collectExtent(part, extent);
}

/**
 * True for a Polygon or MultiPolygon whose bounding box is wider or taller
 * than `maxDeg` degrees. Points and lines are never reported: a single
 * long centerline (a highway across several states) is legitimate, and costs
 * only the tiles along its path, not every tile inside its bounding box.
 *
 * A polygon that crosses the antimeridian has a longitude range near 360
 * degrees and is reported too; tippecanoe handles those poorly anyway.
 */
export function exceedsMaxExtent(geometry, maxDeg = MAX_POLYGON_EXTENT_DEG) {
    if (!geometry || (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')) return false;

    const extent = { minLon: Infinity, maxLon: -Infinity, minLat: Infinity, maxLat: -Infinity };
    collectExtent(geometry.coordinates, extent);

    return (extent.maxLon - extent.minLon) > maxDeg || (extent.maxLat - extent.minLat) > maxDeg;
}
