import { lookup } from './boundaries.js';

// Filled from a discarded duplicate's value, if one has it.
const DUPLICATE_FIELDS = ['region', 'district', 'city', 'postcode'];

// Additionally fall back to a boundary point-in-polygon lookup. Postcode is
// deliberately excluded - no reliable free global postcode polygon source
// exists (see spec).
const BOUNDARY_FIELDS = ['region', 'district'];

function isBlank(value) {
    return !value || !String(value).trim();
}

/**
 * Fill blank fields on the surviving record of a dedupe group. Never
 * overwrites a field the record already has. Every field actually filled
 * is recorded in properties.oa_backfill.
 */
export function backfillFeature(feature, discarded, boundaries) {
    const props = feature.properties;
    const filled = [];

    for (const field of DUPLICATE_FIELDS) {
        if (!isBlank(props[field])) continue;

        for (const dup of discarded) {
            const value = dup.properties[field];
            if (!isBlank(value)) {
                props[field] = value;
                filled.push(field);
                break;
            }
        }
    }

    for (const field of BOUNDARY_FIELDS) {
        if (!isBlank(props[field])) continue;

        const [lon, lat] = feature.geometry.coordinates;
        const value = lookup(boundaries, field, lon, lat);
        if (value) {
            props[field] = value;
            filled.push(field);
        }
    }

    if (filled.length) props.oa_backfill = filled;

    return feature;
}
