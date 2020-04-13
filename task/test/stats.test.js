'use strict';

const path = require('path');
const Stats = require('../lib/stats');
const test = require('tape');

test('Stats()', (t) => {
    t.throws(() => {
        new Stats();
    }, /Stats.file must be a string/, 'Stats.file must be a string');

    const stats = new Stats(path.resolve(__dirname, './fixtures/addresses.geojson'));

    t.ok(/batch\/task\/test\/fixtures\/addresses.geojson/.test(stats.file), 'stats.file: <geojson>');
    t.deepEquals(stats.stats, {
        count: 0,
        bounds: []
    }, 'stats.stats: { ... }');

    t.end();
});

test('Stats#calc', async (t) => {
    const stats = new Stats(path.resolve(__dirname, './fixtures/addresses.geojson'));

    try {
        await stats.calc();
    } catch (err) {
        t.error(err);
    }

    t.deepEquals(stats.stats.bounds, [ -74.9834588, 40.0546411, -74.9679742, 40.0614019 ], 'Stats.stats.bounds: [ ... ]');
    t.equals(stats.stats.count, 100, 'stats.stats.count: 100');

    t.end();
});
