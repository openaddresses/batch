import path from 'node:path';

const RANK = {
    country: 0,
    state: 1,
    county: 2
};

const DEFAULT_RANK = 3;

const MARKERS = [
    { rank: RANK.country, pattern: /(^|[-_])(nationwide|countrywide)([-_]|$)/ },
    { rank: RANK.state, pattern: /(^|[-_])statewide([-_]|$)/ },
    { rank: RANK.county, pattern: /(^|[-_])(countywide|county)([-_]|$)/ }
];

/**
 * Rank a source's file path by geographic granularity. Higher rank = more
 * local. Sources without a recognized "statewide"/"countywide"/etc marker
 * in their filename are assumed to be the most specific (e.g. a named city
 * or town file).
 */
export function sourcePriority(sourcePath) {
    const base = path.parse(sourcePath).name.toLowerCase();

    for (const marker of MARKERS) {
        if (marker.pattern.test(base)) return marker.rank;
    }

    return DEFAULT_RANK;
}
