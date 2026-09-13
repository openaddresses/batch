export const STALE_DAYS = 30;
export const LAYERS = ['addresses', 'buildings', 'parcels', 'centerlines'];

const STATE_ORDER = ['never', 'stale', 'healthy'];

const DAY_MS = 24 * 60 * 60 * 1000;

export function classifyEntry(entry, now = new Date()) {
    if (!entry.updated) return 'never';

    const ageDays = (new Date(now) - new Date(entry.updated)) / DAY_MS;

    return ageDays > STALE_DAYS ? 'stale' : 'healthy';
}

export function worstState(states) {
    for (const state of STATE_ORDER) {
        if (states.includes(state)) return state;
    }

    return null;
}
