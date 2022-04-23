import test from 'node:test';
import assert from 'assert';
import Flight from './flight.js';
import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));
const flight = new Flight();

flight.init();
flight.takeoff();

test('POST: /api/run', async () => {
    try {
        const res = await flight.fetch('/api/run', {
            method: 'POST',
            headers: {
                'shared-secret': '123'
            },
            body: {
                live: true
            }
        }, true);

        assert.equal(res.body.id, 1, 'run.id: 1');
        assert.ok(res.body.created, 'run.created: <truthy>');
        assert.deepEqual(res.body.github, {}, 'run.github: {}');
        assert.deepEqual(res.body.closed, false, 'run.closed: false');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('POST: /api/run/:run/jobs', async () => {
    try {
        const res = await flight.fetch('/api/run/1/jobs', {
            method: 'POST',
            headers: {
                'shared-secret': '123'
            },
            body: {
                jobs: [
                    'https://raw.githubusercontent.com/openaddresses/openaddresses/39e3218cee02100ce614e10812bdd74afa509dc4/sources/us/dc/statewide.json'
                ]
            }
        }, true);

        assert.deepEqual(res.body, {
            run: 1,
            jobs: [1]
        }, 'Run 1 populated');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('PATCH: /api/job/:job', async () => {
    try {
        const res = await flight.fetch('/api/job/1', {
            method: 'PATCH',
            headers: {
                'shared-secret': '123'
            },
            body: {
                status:'Success',
                output: {
                    cache: true,
                    output: true,
                    preview: true,
                    validated: true
                },
                count: 12610,
                bounds: {
                    type: 'Polygon',
                    coordinates: [[[-109.962708,43.932074],[-108.58608,43.932074],[-108.58608,44.999901],[-109.962708,44.999901],[-109.962708,43.932074]]]
                },
                stats: {
                    counts: {
                        unit: 0,
                        number: 12597,
                        street: 12603,
                        city: 0,
                        district: 0,
                        region: 0,
                        postcode: 0
                    }
                },
                size: 339560
            }
        }, true);

        assert.equal(res.body.id, 1, 'job.id: 1');
        assert.equal(res.body.run, 1, 'job.run: 1');
        assert.ok(res.body.created, 'job.created: <truthy>');
        assert.equal(res.body.source, 'https://raw.githubusercontent.com/openaddresses/openaddresses/39e3218cee02100ce614e10812bdd74afa509dc4/sources/us/dc/statewide.json', 'job.source: <url>');
        assert.equal(res.body.layer, 'addresses', 'job.layer: addresses');
        assert.equal(res.body.name, 'dcgis', 'job.name: dcgis');
        assert.deepEqual(res.body.output, {
            cache: true,
            output: true,
            preview: true,
            validated: true
        }, 'job.output: { ... }');
        assert.equal(res.body.loglink, null, 'job.loglink: null');
        assert.equal(res.body.status, 'Success', 'job.status: Success');
        assert.equal(res.body.version, pkg.version, 'job.version: <semver>');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: /api/job/:job', async () => {
    try {
        const res = await flight.fetch('/api/job/1', {
            method: 'GET'
        }, true);

        assert.equal(res.body.id, 1, 'job.id: 1');
        assert.equal(res.body.run, 1, 'job.run: 1');
        assert.ok(res.body.created, 'job.created: <truthy>');
        assert.equal(res.body.source, 'https://raw.githubusercontent.com/openaddresses/openaddresses/39e3218cee02100ce614e10812bdd74afa509dc4/sources/us/dc/statewide.json', 'job.source: <url>');
        assert.equal(res.body.layer, 'addresses', 'job.layer: addresses');
        assert.equal(res.body.name, 'dcgis', 'job.name: dcgis');
        assert.deepEqual(res.body.output, {
            cache: true,
            output: true,
            preview: true,
            validated: true
        }, 'job.output: { ... }');
        assert.equal(res.body.loglink, null, 'job.loglink: null');
        assert.equal(res.body.status, 'Success', 'job.status: Success');
        assert.equal(res.body.version, pkg.version, 'job.version: <semver>');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: /api/job', async () => {
    try {
        const res = await flight.fetch('/api/job', {
            method: 'GET'
        }, true);

        assert.ok(res.body[0].created);
        delete res.body[0].created;

        assert.deepEqual(res.body, [{
            id: 1,
            run: 1,
            map: 1,
            source: 'https://raw.githubusercontent.com/openaddresses/openaddresses/39e3218cee02100ce614e10812bdd74afa509dc4/sources/us/dc/statewide.json',
            source_name: 'us/dc/statewide',
            layer: 'addresses',
            name: 'dcgis',
            output: {
                cache: true,
                output: true,
                preview: true,
                validated: true
            },
            loglink: null,
            status: 'Success',
            size: 339560
        }]);
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

flight.landing();
