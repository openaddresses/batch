'use strict';

const pkg = require('../package.json');
const test = require('tape');
const Flight = require('./flight');
const nock = require('nock');

const flight = new Flight();

flight.init(test);
flight.takeoff(test);

test('POST: /api/run', async (t) => {
    try {
        const res = await flight.request({
            url: 'http://localhost:4999/api/run',
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

test('POST: /api/run/:run/jobs', async (t) => {
    nock('https://raw.githubusercontent.com')
        .get('/openaddresses/openaddresses/39e3218cee02100ce614e10812bdd74afa509dc4/sources/us/dc/statewide.json')
        .reply(200, require('./fixtures/dc-statewide.json'));

    try {
        const res = await flight.request({
            url: 'http://localhost:4999/api/run/1/jobs',
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

test('PATCH: /api/job/:job', async (t) => {
    try {
        const res = await flight.request({
            url: 'http://localhost:4999/api/job/1',
            method: 'PATCH',
            json: true,
            headers: {
                'shared-secret': '123'
            },
            body: {
                status:'Success',
                output: {
                    cache: true,
                    output: true,
                    preview: true
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
        }, t);

        t.equals(res.body.id, 1, 'job.id: 1');
        t.equals(res.body.run, 1, 'job.run: 1');
        t.ok(res.body.created, 'job.created: <truthy>');
        t.equals(res.body.source, 'https://raw.githubusercontent.com/openaddresses/openaddresses/39e3218cee02100ce614e10812bdd74afa509dc4/sources/us/dc/statewide.json', 'job.source: <url>');
        t.equals(res.body.layer, 'addresses', 'job.layer: addresses');
        t.equals(res.body.name, 'dcgis', 'job.name: dcgis');
        t.deepEquals(res.body.output, {
            cache: true,
            output: true,
            preview: true
        }, 'job.output: { ... }');
        t.equals(res.body.loglink, null, 'job.loglink: null');
        t.equals(res.body.status, 'Success', 'job.status: Success');
        t.equals(res.body.version, pkg.version, 'job.version: <semver>');
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET: /api/job/:job', async (t) => {
    try {
        const res = await flight.request({
            url: 'http://localhost:4999/api/job/1',
            method: 'GET',
            json: true,
        }, t);

        t.equals(res.body.id, 1, 'job.id: 1');
        t.equals(res.body.run, 1, 'job.run: 1');
        t.ok(res.body.created, 'job.created: <truthy>');
        t.equals(res.body.source, 'https://raw.githubusercontent.com/openaddresses/openaddresses/39e3218cee02100ce614e10812bdd74afa509dc4/sources/us/dc/statewide.json', 'job.source: <url>');
        t.equals(res.body.layer, 'addresses', 'job.layer: addresses');
        t.equals(res.body.name, 'dcgis', 'job.name: dcgis');
        t.deepEquals(res.body.output, {
            cache: true,
            output: true,
            preview: true
        }, 'job.output: { ... }');
        t.equals(res.body.loglink, null, 'job.loglink: null');
        t.equals(res.body.status, 'Success', 'job.status: Success');
        t.equals(res.body.version, pkg.version, 'job.version: <semver>');
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET: /api/job', async (t) => {
    try {
        const res = await flight.request({
            url: 'http://localhost:4999/api/job',
            method: 'GET',
            json: true,
        }, t);

        t.ok(res.body[0].created)
        delete res.body[0].created;

        t.deepEquals(res.body, [{
            id: 1,
            run: 1,
            map: null,
            source: 'https://raw.githubusercontent.com/openaddresses/openaddresses/39e3218cee02100ce614e10812bdd74afa509dc4/sources/us/dc/statewide.json',
            source_name: 'us/dc/statewide',
            layer: 'addresses',
            name: 'dcgis',
            output: {
                cache: true,
                output: true,
                preview: true
            },
            loglink: null,
            status: 'Success',
            size: 339560
        }]);
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

flight.landing(test);

test('close', (t) => {
    nock.cleanAll();
    nock.enableNetConnect();
    t.end();
});

