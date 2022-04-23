import test from 'node:test';
import assert from 'assert';
import Flight from './flight.js';
import fs from 'fs';

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

test('PATCH: api/job/:job', async () => {
    try {
        const res = await flight.fetch('/api/job/1', {
            method: 'PATCH',
            headers: {
                'shared-secret': '123'
            },
            body: {
                status: 'Fail'
            }
        }, true);

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
        assert.equal(res.body.status, 'Fail', 'job.status: Fail');
        assert.equal(res.body.version, pkg.version, 'job.version: <semver>');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('POST: api/job/error', async () => {
    try {
        const res = await flight.fetch('/api/job/error', {
            method: 'POST',
            headers: {
                'shared-secret': '123'
            },
            body: {
                job: 1,
                message: 'Something went wrong!'
            }
        }, true);

        assert.deepEqual(res.body, {
            job: 1,
            message: 'Something went wrong!'
        });
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: api/job/error', async () => {
    try {
        const res = await flight.fetch('/api/job/error', {
            method: 'GET'
        }, true);

        assert.deepEqual(res.body, [{
            id: 1,
            status: 'Fail',
            messages: ['Something went wrong!'],
            source_name: 'us/dc/statewide',
            layer: 'addresses',
            name: 'dcgis'
        }]);
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: api/job/error/1', async () => {
    try {
        const res = await flight.fetch('/api/job/error/1', {
            method: 'GET'
        }, true);

        assert.deepEqual(res.body, {
            id: 1,
            status: 'Fail',
            messages: ['Something went wrong!'],
            source_name: 'us/dc/statewide',
            layer: 'addresses',
            name: 'dcgis'
        });
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('POST: api/job/error', async () => {
    try {
        const res = await flight.fetch('/api/job/error', {
            method: 'POST',
            headers: {
                'shared-secret': '123'
            },
            body: {
                job: 1,
                message: 'Another Something went wrong!'
            }
        }, true);

        assert.deepEqual(res.body, {
            job: 1,
            message: 'Another Something went wrong!'
        });
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: api/job/error', async () => {
    try {
        const res = await flight.fetch('/api/job/error', {
            method: 'GET'
        }, true);

        assert.deepEqual(res.body, [{
            id: 1,
            status: 'Fail',
            messages: ['Something went wrong!', 'Another Something went wrong!'],
            source_name: 'us/dc/statewide',
            layer: 'addresses',
            name: 'dcgis'
        }]);

    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: api/job/error/1', async () => {
    try {
        const res = await flight.fetch('/api/job/error/1', {
            method: 'GET'
        }, true);

        assert.deepEqual(res.body, {
            id: 1,
            status: 'Fail',
            messages: ['Something went wrong!', 'Another Something went wrong!'],
            source_name: 'us/dc/statewide',
            layer: 'addresses',
            name: 'dcgis'
        });
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('POST: api/job/error/1', async () => {
    try {
        const res = await flight.fetch('/api/job/error/1', {
            method: 'POST',
            headers: {
                'shared-secret': '123'
            },
            body: {
                moderate: 'reject'
            }
        }, true);

        assert.deepEqual(res.body, {
            job: 1,
            moderate: 'reject'
        });
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: api/job/error', async () => {
    try {
        const res = await flight.fetch('/api/job/error', {
            method: 'GET',
            json: true
        }, false);

        assert.equal(res.status, 404, 'http: 404');

        assert.deepEqual(res.body, {
            status: 404,
            message: 'No job errors found',
            messages: []
        });
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: api/job/error/1', async () => {
    try {
        const res = await flight.fetch('/api/job/error/1', {
            method: 'GET'
        }, false);

        assert.equal(res.status, 404, 'http: 404');

        assert.deepEqual(res.body, { status: 404, message: 'No job errors found', messages: [] });
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

flight.landing();
