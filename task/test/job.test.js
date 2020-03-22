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
    } catch(err) {
        t.error(err);
    }

    t.end();
});
