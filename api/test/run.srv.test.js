import fs from 'fs';
import test from 'node:test';
import assert from 'assert';
import Flight from './flight.js';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));

const flight = new Flight();

flight.init();
flight.takeoff();

test('POST: api/run', async () => {
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

test('GET: api/run', async () => {
    try {
        const res = await flight.fetch('/api/run', {
            method: 'GET'
        }, true);

        assert.equal(res.status, 200, 'http: 200');

        // Run will not return as it has not yet been populated
        assert.equal(res.body.length, 0, 'run.length: 0');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('POST: api/run/:run/jobs', async () => {
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

test('GET: api/data', async () => {
    try {
        const res = await flight.fetch('/api/data', {
            method: 'GET'
        }, true);

        assert.deepEqual(res.body, [], 'run.length: 0');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('PATCH: api/job/:job', async () => {
    try {
        const res = await flight.fetch('/api/job/1', {
            method: 'PATCH',
            headers: {
                'shared-secret': '123'
            },
            body: {
                status: 'Success'
            }
        }, true);

        assert.equal(res.status, 200, 'http: 200');

        assert.equal(res.body.id, 1, 'job.id: 1');
        assert.equal(res.body.run, 1, 'job.run: 1');
        assert.ok(res.body.created, 'job.created: <truthy>');
        assert.equal(res.body.source, 'https://raw.githubusercontent.com/openaddresses/openaddresses/39e3218cee02100ce614e10812bdd74afa509dc4/sources/us/dc/statewide.json', 'job.source: <url>');
        assert.equal(res.body.layer, 'addresses', 'job.layer: addresses');
        assert.equal(res.body.name, 'dcgis', 'job.name: dcgis');
        assert.deepEqual(res.body.output, {
            cache: false,
            output: false,
            preview: false,
            validated: false
        }, 'job.output: { ... }');
        assert.equal(res.body.loglink, null, 'job.loglink: null');
        assert.equal(res.body.status, 'Success', 'job.status: Success');
        assert.equal(res.body.version, pkg.version, 'job.version: <semver>');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: api/data', async () => {
    try {
        const res = await flight.fetch('/api/data', {
            method: 'GET'
        }, true);

        assert.ok(res.body[0].updated, 'data.updated: <truthy>');
        delete res.body[0].updated;

        assert.deepEqual(res.body, [{
            id: 1,
            source: 'us/dc/statewide',
            fabric: false,
            layer: 'addresses',
            name: 'dcgis',
            job: 1,
            size: 0,
            output: {
                cache: false,
                output: false,
                preview: false,
                validated: false
            },
            map: 1
        }], 'data: { ... }');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

flight.landing();
