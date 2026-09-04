import moment from 'moment-timezone';

export const STALE_DAYS = 30;
export const LAYERS = ['addresses', 'buildings', 'parcels', 'centerlines'];

const STATE_ORDER = ['never', 'stale', 'healthy'];

export function classifyEntry(entry, now = new Date()) {
    if (!entry.updated) return 'never';

    const ageDays = moment(now).diff(moment(entry.updated), 'days', true);

    return ageDays > STALE_DAYS ? 'stale' : 'healthy';
}

export function worstState(states) {
    for (const state of STATE_ORDER) {
        if (states.includes(state)) return state;
    }

    return null;
}
