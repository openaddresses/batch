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

export function groupBySource(rows, now = new Date()) {
    const bySource = new Map();

    for (const row of rows) {
        if (!bySource.has(row.source)) {
            bySource.set(row.source, {
                source: row.source,
                layers: {},
                worst: null
            });
        }

        const source = bySource.get(row.source);
        const state = classifyEntry(row, now);

        if (!source.layers[row.layer]) {
            source.layers[row.layer] = { state, entries: [] };
        }

        source.layers[row.layer].entries.push({
            layer: row.layer,
            name: row.name,
            state,
            updated: row.updated,
            job: row.job
        });

        source.layers[row.layer].state = worstState([
            source.layers[row.layer].state,
            state
        ]);
    }

    for (const source of bySource.values()) {
        source.worst = worstState(Object.values(source.layers).map((l) => l.state));
    }

    return [...bySource.values()];
}
