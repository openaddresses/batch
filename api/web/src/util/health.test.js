import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyEntry, worstState, STALE_DAYS, LAYERS } from './health.js';

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

test('classifyEntry accepts updated as an epoch-ms integer (the real API shape)', () => {
    const now = new Date('2026-08-08T00:00:00Z');
    const updatedMs = now.getTime() - 90 * 24 * 60 * 60 * 1000;
    assert.equal(classifyEntry({ updated: updatedMs }, now), 'stale');
});

test('worstState prioritizes never over stale over healthy', () => {
    assert.equal(worstState(['healthy', 'stale', 'never']), 'never');
    assert.equal(worstState(['healthy', 'stale']), 'stale');
    assert.equal(worstState(['healthy']), 'healthy');
    assert.equal(worstState([]), null);
});
