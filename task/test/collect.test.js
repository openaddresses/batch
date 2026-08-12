import test from 'tape';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Writable } from 'node:stream';
import { readSourceFeatures, writeFeatures, MAX_PROCESSED_FEATURES } from '../collect.js';

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

test('readSourceFeatures streams a source file line by line', async (t) => {
    const file = tmpSource([feature(1), feature(2), '', feature(3), '']);

    const features = await readSourceFeatures(file, 'a.json');

    t.equals(features.length, 3, 'blank lines are skipped, real features are parsed');
    t.equals(features[2].properties.number, '3');
    t.end();
});

test('readSourceFeatures skips a malformed line without aborting the source', async (t) => {
    const file = tmpSource([feature(1), '{"type": "Feature", "propert', feature(2)]);

    const logs = [];
    const original = console.error;
    console.error = (msg) => logs.push(msg);

    let features;
    try {
        features = await readSourceFeatures(file, 'a.json');
    } finally {
        console.error = original;
    }

    t.equals(features.length, 2, 'the good features either side of the bad line are kept');
    t.equals(logs.length, 1, 'the malformed line is logged once');
    t.end();
});

test('readSourceFeatures stops reading once the feature budget is exceeded', async (t) => {
    // The safety valve in process_collection depends on this: an oversized
    // collection has to be detected without first allocating its way to an
    // uncatchable V8 heap OOM.
    const file = tmpSource([feature(1), feature(2), feature(3), feature(4), feature(5)]);

    const features = await readSourceFeatures(file, 'a.json', 2);

    t.equals(features.length, 3, 'reading stops one feature past the budget, not at the end of the file');
    t.end();
});

test('readSourceFeatures reads a file whose total size exceeds the V8 max string length in chunks', async (t) => {
    // Not a real 512MB file (too slow for CI) - this just pins the contract
    // that the reader never materializes the whole file as one JS string,
    // which is what readFileSync(..., 'utf8') used to do.
    const file = tmpSource(Array.from({ length: 5000 }, (_, i) => feature(i)));

    const readFileSync = fs.readFileSync;
    let readWholeFile = false;
    fs.readFileSync = (...args) => {
        readWholeFile = true;
        return readFileSync(...args);
    };

    let features;
    try {
        features = await readSourceFeatures(file, 'a.json');
    } finally {
        fs.readFileSync = readFileSync;
    }

    t.equals(features.length, 5000);
    t.equals(readWholeFile, false, 'the source file is never slurped with readFileSync');
    t.end();
});

test('MAX_PROCESSED_FEATURES is a defined, conservative safety limit', (t) => {
    t.equals(typeof MAX_PROCESSED_FEATURES, 'number');
    // api/lib/batch.js runs the collect job with --max-old-space-size=10000;
    // at ~1.5KB/feature that heap ceiling is ~6.8M features, so the limit
    // should sit comfortably under that with headroom to spare.
    t.ok(MAX_PROCESSED_FEATURES > 0 && MAX_PROCESSED_FEATURES <= 6800000, 'limit is set within the batch worker\'s 10000MB old-space heap ceiling');
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
