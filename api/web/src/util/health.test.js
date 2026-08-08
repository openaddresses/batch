import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyEntry, worstState, groupBySource, STALE_DAYS, LAYERS } from './health.js';

test('LAYERS lists the four supported layer types in display order', () => {
    assert.deepEqual(LAYERS, ['addresses', 'buildings', 'parcels', 'centerlines']);
});

test('classifyEntry returns never when updated is null', () => {
    assert.equal(classifyEntry({ updated: null }), 'never');
});

test('classifyEntry returns healthy when updated is recent', () => {
    const now = new Date('2026-08-08T00:00:00Z');
    const updated = new Date('2026-08-01T00:00:00Z').toISOString();
    assert.equal(classifyEntry({ updated }, now), 'healthy');
});

test('classifyEntry returns stale when updated is older than STALE_DAYS', () => {
    const now = new Date('2026-08-08T00:00:00Z');
    const updated = new Date('2026-01-01T00:00:00Z').toISOString();
    assert.equal(classifyEntry({ updated }, now), 'stale');
});

test('classifyEntry treats exactly STALE_DAYS old as still healthy', () => {
    const now = new Date('2026-08-08T00:00:00Z');
    const updated = new Date(now.getTime() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    assert.equal(classifyEntry({ updated }, now), 'healthy');
});

test('worstState prioritizes never over stale over healthy', () => {
    assert.equal(worstState(['healthy', 'stale', 'never']), 'never');
    assert.equal(worstState(['healthy', 'stale']), 'stale');
    assert.equal(worstState(['healthy']), 'healthy');
    assert.equal(worstState([]), null);
});

test('groupBySource groups rows by source and picks the worst state per layer', () => {
    const now = new Date('2026-08-08T00:00:00Z');
    const rows = [
        { source: 'us/ca/example', layer: 'addresses', name: 'county-a', updated: now.toISOString(), job: 1 },
        { source: 'us/ca/example', layer: 'addresses', name: 'county-b', updated: null, job: 2 },
        { source: 'us/ca/example', layer: 'buildings', name: '', updated: new Date('2026-01-01T00:00:00Z').toISOString(), job: 3 }
    ];

    const grouped = groupBySource(rows, now);

    assert.equal(grouped.length, 1);
    const [source] = grouped;
    assert.equal(source.source, 'us/ca/example');
    assert.equal(source.layers.addresses.state, 'never');
    assert.equal(source.layers.addresses.entries.length, 2);
    assert.equal(source.layers.buildings.state, 'stale');
    assert.equal(source.layers.parcels, undefined);
    assert.equal(source.worst, 'never');
});

test('groupBySource marks a source healthy overall when every layer is healthy', () => {
    const now = new Date('2026-08-08T00:00:00Z');
    const rows = [
        { source: 'ca/on/toronto', layer: 'addresses', name: '', updated: now.toISOString(), job: 10 }
    ];

    const [source] = groupBySource(rows, now);

    assert.equal(source.worst, 'healthy');
});
