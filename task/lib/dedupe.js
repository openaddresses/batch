import { normalizeNumber, normalizeStreet } from './normalize.js';

// ~11m at the equator - two records within this grid distance (checking
// the 3x3 neighborhood below) are candidates for matching.
const CELL_SIZE_DEG = 0.0001;

function cellCoords(lon, lat) {
    return [Math.floor(lat / CELL_SIZE_DEG), Math.floor(lon / CELL_SIZE_DEG)];
}

function neighborKeys(lon, lat) {
    const [cellLat, cellLon] = cellCoords(lon, lat);
    const keys = [];
    for (let dLat = -1; dLat <= 1; dLat++) {
        for (let dLon = -1; dLon <= 1; dLon++) {
            keys.push(`${cellLat + dLat}:${cellLon + dLon}`);
        }
    }
    return keys;
}

/**
 * Minimal unit normalization - just enough for a case-insensitive,
 * whitespace-collapsed comparison. Deliberately not a full street-style
 * normalization: "Apt 2" vs "#2" are left as distinct values because
 * wrongly treating them as equal deletes a real address.
 *
 * A blank/missing unit normalizes to '' and therefore only matches another
 * blank unit - a single-family record is never a duplicate of a specific
 * apartment in the same building.
 */
function normalizeUnit(unit) {
    if (unit === undefined || unit === null) return '';
    return String(unit).toLowerCase().replace(/\s+/g, ' ').trim();
}

function hasPostcode(feature) {
    const value = feature.properties && feature.properties.postcode;
    return !!(value && String(value).trim());
}

/**
 * Bucket features into a coordinate grid, union matching records (same/
 * adjacent cell + matching normalized number/street) into groups, and pick
 * one surviving record per group: prefer a populated postcode, then the
 * highest (most local) source priority. Records match on normalized
 * number + street + unit, so the many units of a multi-unit building
 * geocoded to a single rooftop point are all preserved.
 */
export function dedupeFeatures(records) {
    const grid = new Map();

    records.forEach((record, idx) => {
        const [lon, lat] = record.feature.geometry.coordinates;
        const [cellLat, cellLon] = cellCoords(lon, lat);
        const key = `${cellLat}:${cellLon}`;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(idx);
    });

    const parent = records.map((_, idx) => idx);
    function find(i) {
        while (parent[i] !== i) {
            parent[i] = parent[parent[i]];
            i = parent[i];
        }
        return i;
    }
    function union(a, b) {
        const ra = find(a);
        const rb = find(b);
        if (ra !== rb) parent[ra] = rb;
    }

    records.forEach((record, idx) => {
        const number = normalizeNumber(record.feature.properties.number);
        const street = normalizeStreet(record.feature.properties.street);
        const unit = normalizeUnit(record.feature.properties.unit);
        if (!number || !street) return;

        const [lon, lat] = record.feature.geometry.coordinates;
        for (const key of neighborKeys(lon, lat)) {
            const bucket = grid.get(key);
            if (!bucket) continue;

            for (const otherIdx of bucket) {
                if (otherIdx <= idx) continue;
                const other = records[otherIdx];
                if (normalizeNumber(other.feature.properties.number) !== number) continue;
                if (normalizeStreet(other.feature.properties.street) !== street) continue;
                if (normalizeUnit(other.feature.properties.unit) !== unit) continue;
                union(idx, otherIdx);
            }
        }
    });

    const groups = new Map();
    records.forEach((_, idx) => {
        const root = find(idx);
        if (!groups.has(root)) groups.set(root, []);
        groups.get(root).push(idx);
    });

    const survivors = [];
    for (const members of groups.values()) {
        members.sort((a, b) => {
            const ra = records[a];
            const rb = records[b];
            const aPost = hasPostcode(ra.feature);
            const bPost = hasPostcode(rb.feature);
            if (aPost !== bPost) return aPost ? -1 : 1;
            if (ra.priority !== rb.priority) return rb.priority - ra.priority;
            return 0;
        });

        const [winnerIdx, ...discardedIdx] = members;
        survivors.push({
            feature: records[winnerIdx].feature,
            discarded: discardedIdx.map((i) => records[i].feature)
        });
    }

    return survivors;
}
