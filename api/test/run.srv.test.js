'use strict';

const pkg = require('../package.json');
const srv = require('../index.js');
const test = require('tape');
const request = require('request');
const { init, token } = require('./init');
let app, pool;

init(test);

test('start: server', async (t) => {
    srv({
        postgres: 'postgres://postgres@localhost:5432/openaddresses_test'
    }, (a, p) => {
        app = a;
        pool = p;
        t.end();
    });
});

test('POST: api/run', async (t) => {
    const tk = await token();

    request({
        url: 'http://localhost:5000/api/run',
        method: 'POST',
        json: true,
        body: {
            live: true
        }
    }, (err, res) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 200, 'http: 200');

        t.equals(res.body.id, 1, 'run.id: 1');
        t.ok(res.body.created, 'run.created: <truthy>');
        t.deepEquals(res.body.github, {}, 'run.github: {}');
        t.deepEquals(res.body.closed, false, 'run.closed: false');

        t.end();
    });
});

test('GET: api/run', (t) => {
    request({
        url: 'http://localhost:5000/api/run',
        method: 'GET',
        json: true
    }, (err, res) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 200, 'http: 200');

        // Run will not return as it has not yet been populated
        t.equals(res.body.length, 0, 'run.length: 0');

        t.end();
    });
});

test('POST: api/run/:run/jobs', (t) => {
    request({
        url: 'http://localhost:5000/api/run/1/jobs',
        method: 'POST',
        json: true,
        body: {
            jobs: [
                'https://raw.githubusercontent.com/openaddresses/openaddresses/39e3218cee02100ce614e10812bdd74afa509dc4/sources/us/dc/statewide.json'
            ]
        }
    }, (err, res) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 200, 'http: 200');

        t.deepEquals(res.body, {
            run: 1,
            jobs: [1]
        }, 'Run 1 populated');
        t.end();
    });
});

test('GET: api/data', (t) => {
    request({
        url: 'http://localhost:5000/api/data',
        method: 'GET',
        json: true
    }, (err, res) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 200, 'http: 200');

        t.deepEquals(res.body, [], 'run.length: 0');
        t.end();
    });
});

test('PATCH: api/job/:job', (t) => {
    request({
        url: 'http://localhost:5000/api/job/1',
        method: 'PATCH',
        json: true,
        body: {
            status: 'Success'
        }
    }, (err, res) => {
        t.error(err, 'no error');

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
            preview: false
        }, 'job.output: { ... }');
        t.equals(res.body.loglink, null, 'job.loglink: null');
        t.equals(res.body.status, 'Success', 'job.status: Success');
        t.equals(res.body.version, pkg.version, 'job.version: <semver>');
        t.end();
    });
});

test('GET: api/data', (t) => {
    request({
        url: 'http://localhost:5000/api/data',
        method: 'GET',
        json: true
    }, (err, res) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 200, 'http: 200');

        t.ok(res.body[0].updated, 'data.updated: <truthy>');
        delete res.body[0].updated;

        t.deepEquals(res.body, [{
            id: 1,
            source: 'us/dc/statewide',
            layer: 'addresses',
            name: 'dcgis',
            job: 1,
            output: {
                cache: false,
                output: false,
                preview: false
            }
        }], 'data: { ... }');
        t.end();
    });
});

test('stop', (t) => {
    pool.end();
    app.close();
    t.end();
});
