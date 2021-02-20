'use strict';

const fs = require('fs');
const path = require('path');
const Job = require('../lib/job');
const test = require('tape');

test('Job#compress', async (t) => {
    try {
        const job = new Job(
            1,
            'http://example.com',
            'addresses',
            'dcgis'
        );

        fs.writeFileSync(path.resolve(job.tmp, 'out.geojson'), 'test-string');

        t.ok(await job.compress());
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('Job#convert', async (t) => {
    try {
        const job = new Job(1, 'fake-url', 'addresses', 'state');

        fs.writeFileSync(
            path.resolve(job.tmp, 'out.csv'),
            fs.readFileSync(path.resolve(__dirname, './fixtures/input.csv'))
        );

        const out = await job.convert();
        t.ok(out, 'output file');

        const file = String(fs.readFileSync(out)).split('\n').filter((row) => {
            return !!row.trim();
        }).map((row) => {
            return JSON.parse(row);
        });

        t.equals(file.length, 99, 'length');

        file.forEach((row) => {
            if (row.geometry.type !== 'Point') t.fail('Point');
        });

        t.equals(job.count, 99, 'job.count');
        t.deepEquals(job.bounds, {
            type: 'Polygon',
            coordinates: [[
                [-64.2400062, 45.9678856],
                [-62.053746, 45.9678856],
                [-62.053746, 46.8613679],
                [-64.2400062, 46.8613679],
                [-64.2400062, 45.9678856]
            ]]
        }, 'job.bounds');
        t.deepEquals(job.stats, {
            counts: {
                unit: 0,
                number: 99,
                street: 99,
                city: 99,
                district: 99,
                region: 0,
                postcode: 0
            }
        }, 'job.stats');
    } catch (err) {
        t.error(err);
    }

    t.end();
});
