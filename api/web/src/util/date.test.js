import test from 'node:test';
import assert from 'node:assert/strict';
import { fmtDate, fmtDateTime } from './date.js';

const local = new Date(2026, 7, 8, 9, 5);

test('fmtDate formats local date as YYYY-MM-DD', () => {
    assert.equal(fmtDate(local), '2026-08-08');
    assert.equal(fmtDate(local.getTime()), '2026-08-08');
    assert.equal(fmtDate(local.toISOString()), '2026-08-08');
});

test('fmtDateTime formats local date and 24h time', () => {
    assert.equal(fmtDateTime(local), '2026-08-08 09:05');
    assert.equal(fmtDateTime(new Date(2026, 7, 8, 21, 30)), '2026-08-08 21:30');
});
