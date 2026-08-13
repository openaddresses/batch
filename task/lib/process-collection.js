import { sourcePriority } from './priority.js';
import { dedupeFeatures } from './dedupe.js';
import { backfillFeature } from './backfill.js';

function isValidFeature(feature) {
    return !!(
        feature
        && feature.properties
        && typeof feature.properties === 'object'
        && feature.geometry
        && feature.geometry.type === 'Point'
        && Array.isArray(feature.geometry.coordinates)
        && feature.geometry.coordinates.length === 2
    );
}

/**
 * Merge every source's features in a collection into one deduped,
 * backfilled feature list. sourceRecords groups features by the source
 * file they came from, so priority is computed once per source rather
 * than per feature.
 */
export function buildProcessedFeatures(sourceRecords, boundaries) {
    const records = [];

    for (const source of sourceRecords) {
        const priority = sourcePriority(source.path);

        for (const feature of source.features) {
            if (!isValidFeature(feature)) continue;
            records.push({ feature, sourcePath: source.path, priority });
        }
    }

    const survivors = dedupeFeatures(records);

    return survivors.map((survivor) => backfillFeature(survivor.feature, survivor.discarded, boundaries));
}
