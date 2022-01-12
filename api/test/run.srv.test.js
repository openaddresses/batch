'use strict';
const pkg = require('../package.json');
const test = require('tape');
const Flight = require('./flight');

const flight = new Flight();

flight.init(test);
flight.takeoff(test);

test('POST: api/run', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/run',
            method: 'POST',
            json: true,
            headers: {
                'shared-secret': '123'
            },
            body: {
                live: true
            }
        }, t);

        t.equals(res.body.id, 1, 'run.id: 1');
        t.ok(res.body.created, 'run.created: <truthy>');
        t.deepEquals(res.body.github, {}, 'run.github: {}');
        t.deepEquals(res.body.closed, false, 'run.closed: false');
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET: api/run', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/run',
            method: 'GET',
            json: true
        }, t);

        t.equals(res.statusCode, 200, 'http: 200');

        // Run will not return as it has not yet been populated
        t.equals(res.body.length, 0, 'run.length: 0');
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('POST: api/run/:run/jobs', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/run/1/jobs',
            method: 'POST',
            json: true,
            headers: {
                'shared-secret': '123'
            },
            body: {
                jobs: [
                    'https://raw.githubusercontent.com/openaddresses/openaddresses/39e3218cee02100ce614e10812bdd74afa509dc4/sources/us/dc/statewide.json'
                ]
            }
        }, t);

        t.deepEquals(res.body, {
            run: 1,
            jobs: [1]
        }, 'Run 1 populated');
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET: api/data', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/data',
            method: 'GET',
            json: true
        }, t);

        t.deepEquals(res.body, [], 'run.length: 0');
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('PATCH: api/job/:job', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/job/1',
            method: 'PATCH',
            json: true,
            headers: {
                'shared-secret': '123'
            },
            body: {
                status: 'Success'
            }
        }, t);

        t.equals(res.statusCode, 200, 'http: 200');

        t.equals(res.body.id, 1, 'job.id: 1');
        t.equals(res.body.run, 1, 'job.run: 1');
        t.ok(res.body.created, 'job.created: <truthy>');
        t.equals(res.body.source, 'https://raw.githubusercontent.com/openaddresses/openaddresses/39e3218cee02100ce614e10812bdd74afa509dc4/sources/us/dc/statewide.json', 'job.source: <url>');
        t.equals(res.body.layer, 'addresses', 'job.layer: addresses');
        t.equals(res.body.name, 'dcgis', 'job.name: dcgis');
        t.deepEquals(res.body.output, {
            cache: false,
            output: false,
            preview: false,
            validated: false
        }, 'job.output: { ... }');
        t.equals(res.body.loglink, null, 'job.loglink: null');
        t.equals(res.body.status, 'Success', 'job.status: Success');
        t.equals(res.body.version, pkg.version, 'job.version: <semver>');
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET: api/data', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/data',
            method: 'GET',
            json: true
        }, t);

        t.ok(res.body[0].updated, 'data.updated: <truthy>');
        delete res.body[0].updated;

        t.deepEquals(res.body, [{
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
        t.error(err, 'no error');
    }

    t.end();
});

flight.landing(test);
