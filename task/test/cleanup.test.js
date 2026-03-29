import test from 'tape';
import { selectJobsToPrune } from '../cleanup.js';

function makeJob(id, daysAgo, { count = 100, size = 5000 } = {}) {
    const created = new Date();
    created.setDate(created.getDate() - daysAgo);
    return { id, created: created.toISOString(), count, size, output: { output: true } };
}

test('selectJobsToPrune - keeps active job regardless of age', (t) => {
    const jobs = [
        makeJob(1, 0),
        makeJob(2, 400, { count: 999 }) // very old, but it's the active job
    ];

    const pruned = selectJobsToPrune(jobs, 2);
    const prunedIds = pruned.map((j) => j.id);

    t.ok(!prunedIds.includes(2), 'active job is never pruned');
    t.end();
});

test('selectJobsToPrune - keeps all jobs within 3 months', (t) => {
    const jobs = [
        makeJob(1, 1, { count: 10 }),
        makeJob(2, 30, { count: 20 }),
        makeJob(3, 60, { count: 30 }),
        makeJob(4, 89, { count: 40 })
    ];

    const pruned = selectJobsToPrune(jobs, 1);

    t.equals(pruned.length, 0, 'nothing pruned within 3 months');
    t.end();
});

test('selectJobsToPrune - keeps one per month for 3-12 months', (t) => {
    // Two jobs in the same month, ~5 months ago
    const jobs = [
        makeJob(1, 1),                          // recent, active
        makeJob(2, 150, { count: 50 }),          // ~5 months ago
        makeJob(3, 155, { count: 60 })           // same month, ~5 months ago
    ];

    const pruned = selectJobsToPrune(jobs, 1);

    // One of job 2 or 3 should be kept (first seen = job 2), the other pruned
    t.equals(pruned.length, 1, 'one of two same-month jobs pruned');
    t.equals(pruned[0].id, 3, 'older same-month job is pruned');
    t.equals(pruned[0]._reason, 'retention', 'reason is retention');
    t.end();
});

test('selectJobsToPrune - keeps one per year beyond 12 months', (t) => {
    // Two jobs from ~18 months ago (same year)
    const jobs = [
        makeJob(1, 1),                          // recent, active
        makeJob(2, 540, { count: 10 }),          // ~18 months ago
        makeJob(3, 570, { count: 20 })           // ~19 months ago, same year
    ];

    const pruned = selectJobsToPrune(jobs, 1);

    t.equals(pruned.length, 1, 'one of two same-year jobs pruned');
    t.equals(pruned[0].id, 3, 'older same-year job is pruned');
    t.end();
});

test('selectJobsToPrune - detects duplicates by count + size', (t) => {
    const jobs = [
        makeJob(1, 1, { count: 100, size: 5000 }),
        makeJob(2, 30, { count: 100, size: 5000 }),  // same count+size as job 1
        makeJob(3, 60, { count: 100, size: 5000 })   // same count+size as job 2
    ];

    const pruned = selectJobsToPrune(jobs, 1);
    const prunedIds = pruned.map((j) => j.id);

    t.ok(prunedIds.includes(2), 'duplicate job 2 is pruned');
    t.ok(prunedIds.includes(3), 'duplicate job 3 is pruned');
    t.ok(pruned.every((j) => j._reason === 'duplicate'), 'all marked as duplicate');
    t.end();
});

test('selectJobsToPrune - does not mark active job as duplicate', (t) => {
    const jobs = [
        makeJob(1, 1, { count: 100, size: 5000 }),
        makeJob(2, 30, { count: 100, size: 5000 })  // same as job 1, but job 2 is active
    ];

    const pruned = selectJobsToPrune(jobs, 2);
    const prunedIds = pruned.map((j) => j.id);

    t.ok(!prunedIds.includes(2), 'active job not pruned even if duplicate');
    t.end();
});

test('selectJobsToPrune - different size is not a duplicate', (t) => {
    const jobs = [
        makeJob(1, 1, { count: 100, size: 5000 }),
        makeJob(2, 30, { count: 100, size: 6000 })  // same count, different size
    ];

    const pruned = selectJobsToPrune(jobs, 1);

    t.equals(pruned.length, 0, 'not a duplicate when sizes differ');
    t.end();
});

test('selectJobsToPrune - zero size is not treated as duplicate', (t) => {
    const jobs = [
        makeJob(1, 1, { count: 100, size: 0 }),
        makeJob(2, 30, { count: 100, size: 0 })  // both size=0, but that means size wasn't tracked
    ];

    const pruned = selectJobsToPrune(jobs, 1);
    const prunedIds = pruned.map((j) => j.id);

    t.ok(!prunedIds.includes(2) || pruned.find((j) => j.id === 2)?._reason !== 'duplicate',
        'size=0 jobs are not marked as duplicates');
    t.end();
});

test('selectJobsToPrune - empty job list', (t) => {
    const pruned = selectJobsToPrune([], 1);

    t.equals(pruned.length, 0, 'no jobs to prune');
    t.end();
});

test('selectJobsToPrune - single job (active)', (t) => {
    const jobs = [makeJob(1, 500)];

    const pruned = selectJobsToPrune(jobs, 1);

    t.equals(pruned.length, 0, 'single active job is kept');
    t.end();
});

test('selectJobsToPrune - mixed retention and duplicates', (t) => {
    const jobs = [
        makeJob(1, 1, { count: 200, size: 8000 }),      // recent, active
        makeJob(2, 10, { count: 200, size: 8000 }),      // recent duplicate
        makeJob(3, 50, { count: 150, size: 7000 }),      // recent, different data
        makeJob(4, 150, { count: 150, size: 7000 }),     // 5mo ago, duplicate of job 3
        makeJob(5, 160, { count: 120, size: 6000 }),     // 5mo ago, same month as job 4
        makeJob(6, 200, { count: 110, size: 5500 }),     // ~7mo ago
        makeJob(7, 500, { count: 80, size: 4000 })       // ~17mo ago
    ];

    const pruned = selectJobsToPrune(jobs, 1);
    const prunedIds = pruned.map((j) => j.id);
    const keptIds = jobs.map((j) => j.id).filter((id) => !prunedIds.includes(id));

    t.ok(keptIds.includes(1), 'active job kept');
    t.ok(keptIds.includes(3), 'recent unique job kept');
    t.ok(prunedIds.includes(2), 'recent duplicate pruned');
    t.ok(prunedIds.includes(4), 'old duplicate pruned');
    t.ok(keptIds.includes(7), 'yearly representative kept');
    t.end();
});
