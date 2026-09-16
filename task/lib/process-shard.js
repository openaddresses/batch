import { sourcePriority } from './priority.js';
import { dedupeFeatures } from './dedupe.js';
import { backfillFeature } from './backfill.js';

/**
 * Dedupe + backfill one tile's working set (its own core records plus
 * records borrowed from neighboring tiles for boundary matching), emitting
 * a survivor only when the winning record is core to this tile - a
 * borrowed winner belongs to, and will be emitted by, its own home tile,
 * which independently sees the same neighborhood.
 */
export function buildShardFeatures(coreByPath, borrowedByPath, boundaries) {
    const records = [];
    const originByFeature = new Map();

    function addGroup(byPath, origin) {
        for (const [sourcePath, features] of byPath) {
            const priority = sourcePriority(sourcePath);
            for (const feature of features) {
                records.push({ feature, sourcePath, priority });
                originByFeature.set(feature, origin);
            }
        }
    }

    addGroup(coreByPath, 'core');
    addGroup(borrowedByPath, 'borrowed');

    const survivors = dedupeFeatures(records);

    return survivors
        .filter((survivor) => originByFeature.get(survivor.feature) === 'core')
        .map((survivor) => backfillFeature(survivor.feature, survivor.discarded, boundaries));
}
