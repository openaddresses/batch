import test from 'tape';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Writable } from 'node:stream';
import { assignSourceFeatures, writeFeatures, createProgressLogger, SHARD_FEATURE_BUDGET, SHARD_FEATURE_LIMIT } from '../collect.js';
import { countCoordinate, buildTiles, DEFAULT_CELL_DEG } from '../lib/tiling.js';

function tmpSource(lines) {
    const dir = fs.mkdtempSync(path.resolve(os.tmpdir(), 'oa-collect-test-'));
    const file = path.resolve(dir, 'source.geojson');
    fs.writeFileSync(file, lines.join('\n'));
    return file;
}

function feature(number) {
    return JSON.stringify({
        type: 'Feature',
        properties: { number: String(number), street: 'Main St' },
        geometry: { type: 'Point', coordinates: [-122, 38] }
    });
}

// Every test feature above sits at the same coordinate, so a cellToTile
// built from that one coordinate routes them all to tile 0.
function singleTileCellToTile() {
    const counts = new Map();
    countCoordinate(counts, -122, 38, DEFAULT_CELL_DEG);
    return buildTiles(counts, { budget: 1000000, cellDeg: DEFAULT_CELL_DEG }).cellToTile;
}

function fakeWriters() {
    const core = [];
    const borrowed = [];
    return {
        core,
        borrowed,
        writeCore: async (idx, relPath, feat) => { core.push({ idx, relPath, feat }); },
        writeBorrowed: async (idx, relPath, feat) => { borrowed.push({ idx, relPath, feat }); }
    };
}

test('assignSourceFeatures streams a source file line by line into shard writers', async (t) => {
    const file = tmpSource([feature(1), feature(2), '', feature(3), '']);
    const writers = fakeWriters();

    await assignSourceFeatures(file, 'a.json', singleTileCellToTile(), writers);

    t.equals(writers.core.length, 3, 'blank lines are skipped, real features are written');
    t.equals(writers.core[2].feat.properties.number, '3');
    t.end();
});

test('assignSourceFeatures skips a malformed line without aborting the source', async (t) => {
    const file = tmpSource([feature(1), '{"type": "Feature", "propert', feature(2)]);
    const writers = fakeWriters();

    const logs = [];
    const original = console.error;
    console.error = (msg) => logs.push(msg);

    try {
        await assignSourceFeatures(file, 'a.json', singleTileCellToTile(), writers);
    } finally {
        console.error = original;
    }

    t.equals(writers.core.length, 2, 'the good features either side of the bad line are kept');
    t.equals(logs.length, 1, 'the malformed line is logged once');
    t.end();
});

test('assignSourceFeatures reads a file whose total size exceeds the V8 max string length in chunks', async (t) => {
    // Not a real 512MB file (too slow for CI) - this just pins the contract
    // that the reader never materializes the whole file as one JS string,
    // which is what readFileSync(..., 'utf8') used to do, nor as one array
    // of parsed features, which used to let a single huge source file blow
    // the heap regardless of SHARD_FEATURE_BUDGET.
    const file = tmpSource(Array.from({ length: 5000 }, (_, i) => feature(i)));
    const writers = fakeWriters();

    const readFileSync = fs.readFileSync;
    let readWholeFile = false;
    fs.readFileSync = (...args) => {
        readWholeFile = true;
        return readFileSync(...args);
    };

    try {
        await assignSourceFeatures(file, 'a.json', singleTileCellToTile(), writers);
    } finally {
        fs.readFileSync = readFileSync;
    }

    t.equals(writers.core.length, 5000);
    t.equals(readWholeFile, false, 'the source file is never slurped with readFileSync');
    t.end();
});

test('SHARD_FEATURE_BUDGET is a defined, conservative per-tile safety limit', (t) => {
    t.equals(typeof SHARD_FEATURE_BUDGET, 'number');
    // api/lib/batch.js runs the collect job with --max-old-space-size=10000;
    // at ~1.5KB/feature that heap ceiling is ~6.8M features. Unlike the old
    // whole-collection MAX_PROCESSED_FEATURES, this now bounds a single
    // tile's working set, so it should sit well under that ceiling with
    // room to spare for the boundary set and multiple in-flight structures.
    t.ok(SHARD_FEATURE_BUDGET > 0 && SHARD_FEATURE_BUDGET <= 2000000, 'budget leaves wide headroom under the batch worker\'s 10000MB old-space heap ceiling');
    t.end();
});

test('SHARD_FEATURE_LIMIT leaves room for a budget-sized tile plus its borrowed boundary records', (t) => {
    t.equals(typeof SHARD_FEATURE_LIMIT, 'number');
    // The 2026-10-11 and 2026-10-18 global runs skipped 35 shards of
    // 1.005M-1.23M features because core + borrowed was checked against the
    // same budget the tiles were split to. The limit must clear those with
    // margin...
    t.ok(SHARD_FEATURE_LIMIT >= 2 * SHARD_FEATURE_BUDGET, 'limit is well above the split budget');
    // ...while staying under the 10000MB old-space heap at ~1.5KB/feature
    // (~6.8M features), with room for the rest of the process.
    t.ok(SHARD_FEATURE_LIMIT <= 4000000, 'limit stays well under the heap ceiling');
    t.end();
});

test('createProgressLogger logs at most once per interval plus always the final item', (t) => {
    let clock = 0;
    const lines = [];
    const error = console.error;
    console.error = (line) => lines.push(line);

    try {
        const log = createProgressLogger('processing', { intervalMs: 60000, now: () => clock });

        log(1, 5);
        clock = 30000;
        log(2, 5);
        clock = 60000;
        log(3, 5, ', 10 skipped');
        clock = 61000;
        log(4, 5);
        clock = 62000;
        log(5, 5);
    } finally {
        console.error = error;
    }

    t.deepEquals(lines, [
        'ok - processing: 3/5, 10 skipped',
        'ok - processing: 5/5'
    ]);
    t.end();
});

test('writeFeatures waits for drain instead of queueing unbounded writes', async (t) => {
    const written = [];
    let pending = null;

    // A sink that never accepts a write synchronously - write() returns false
    // until the deferred callback runs, which is what a backed-up disk looks
    // like. A loop that ignores the return value would buffer everything.
    const out = new Writable({
        highWaterMark: 1,
        write(chunk, enc, cb) {
            written.push(chunk.toString());
            pending = cb;
        }
    });

    const features = [{ n: 1 }, { n: 2 }, { n: 3 }];
    const done = writeFeatures(out, features);

    await new Promise((resolve) => setImmediate(resolve));
    t.equals(written.length, 1, 'only the first feature is written before backpressure is respected');

    while (pending) {
        const cb = pending;
        pending = null;
        cb();
        await new Promise((resolve) => setImmediate(resolve));
    }

    await done;

    t.equals(written.length, 3, 'every feature is eventually written');
    t.deepEquals(written.map((w) => JSON.parse(w)), features, 'features are written in order as ndjson');
    t.end();
});

test('writeFeatures rejects if the stream errors while it is waiting to drain', async (t) => {
    const out = new Writable({
        highWaterMark: 1,
        write() {
            // Never calls back and never drains - only the error path resolves.
        }
    });

    const done = writeFeatures(out, [{ n: 1 }, { n: 2 }]);

    await new Promise((resolve) => setImmediate(resolve));
    out.emit('error', new Error('disk full'));

    try {
        await done;
        t.fail('writeFeatures should reject when the stream errors');
    } catch (err) {
        t.equals(err.message, 'disk full', 'the stream error is surfaced, not hung on forever');
    }

    t.end();
});
