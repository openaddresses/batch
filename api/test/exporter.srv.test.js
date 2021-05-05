'use strict';

const test = require('tape');
const Flight = require('./init');
const { promisify } = require('util');
const request = promisify(require('request'));

const flight = new Flight();

flight.init(test);
flight.takeoff(test, {
    limit: {
        exports: 1
    }
});

test('POST: /api/run', async (t) => {
    try {
        const res = await request({
            url: 'http://localhost:4999/api/run',
            method: 'POST',
            json: true,
            headers: {
                'shared-secret': '123'
            },
            body: {
                live: true
            }
        });

        t.equals(res.statusCode, 200, 'http: 200');

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
    try {
        const res = await request({
            url: 'http://localhost:4999/api/run/1/jobs',
            method: 'POST',
            json: true,
            headers: {
                'shared-secret': '123'
            },
            body: {
                jobs: [{
                    source: 'https://raw.githubusercontent.com/openaddresses/openaddresses/39e3218cee02100ce614e10812bdd74afa509dc4/sources/us/dc/statewide.json',
                    layer: 'addresses',
                    name: 'dcgis'
                }]
            }
        });

        t.equals(res.statusCode, 200, 'http: 200');

        t.deepEquals(res.body, {
            run: 1,
            jobs: [1]
        }, 'Run 1 populated');
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

let usr;

test('POST /api/export - cannot export unsuccessful', async (t) =>  {
    try {
        usr = await flight.token('test-backer', {
            level: 'backer'
        });

        const exp = await request({
            url: 'http://localhost:4999/api/export',
            method: 'POST',
            json: true,
            jar: usr.jar,
            body: {
                job_id: 1,
                format: 'csv'
            }
        });

        t.equals(exp.statusCode, 400, 'http: 400');

        t.deepEquals(exp.body, {
            status: 400,
            message: 'Cannot export a job that was not successful',
            messages: []
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('PATCH /api/job/1', async (t) =>  {
    try {
        const res = await request({
            url: 'http://localhost:4999/api/job/1',
            method: 'PATCH',
            json: true,
            headers: {
                'shared-secret': '123'
            },
            body: {
                status: 'Success'
            }
        });

        t.equals(res.statusCode, 200, 'http: 200');
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('POST /api/export - no donor level', async (t) =>  {
    try {
        const usr = await flight.token('test');

        const exp = await request({
            url: 'http://localhost:4999/api/export',
            method: 'POST',
            json: true,
            jar: usr.jar,
            body: {
                job_id: 1,
                format: 'csv'
            }
        });

        t.deepEquals(exp.body, {
            status: 401,
            message: 'Please donate to use this feature',
            messages: []
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('POST /api/export - backer', async (t) =>  {
    try {
        const exp = await request({
            url: 'http://localhost:4999/api/export',
            method: 'POST',
            json: true,
            jar: usr.jar,
            body: {
                job_id: 1,
                format: 'csv'
            }
        });

        t.equals(exp.statusCode, 200, 'http: 200');

        t.ok(exp.body.created, '.created: <date>');
        delete exp.body.created;
        t.ok(exp.body.expiry, '.expiry: <date>');
        delete exp.body.expiry;

        t.deepEquals(exp.body, {
            id: 1,
            uid: 1,
            job_id: 1,
            size: null,
            status: 'Pending',
            format: 'csv',
            loglink: null
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/export - backer', async (t) =>  {
    try {
        const exp = await request({
            url: 'http://localhost:4999/api/export',
            method: 'GET',
            json: true,
            jar: usr.jar
        });

        t.ok(exp.body.exports[0].created, '.exports[0].created: <date>');
        delete exp.body.exports[0].created;
        t.ok(exp.body.exports[0].expiry, '.exports[0].expiry: <date>');
        delete exp.body.exports[0].expiry;

        t.deepEquals(exp.body, {
            total: 1,
            exports: [{
                id: 1,
                uid: 1,
                job_id: 1,
                size: null,
                status: 'Pending',
                loglink: null,
                source_name: 'us/dc/statewide',
                layer: 'addresses',
                format: 'csv',
                name: 'dcgis'
            }]
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/export/100 - backer', async (t) =>  {
    try {
        const exp = await request({
            url: 'http://localhost:4999/api/export/100',
            method: 'GET',
            json: true,
            jar: usr.jar
        });

        t.deepEquals(exp.body, { status: 404, message: 'no exports by that id', messages: [] });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('PATCH /api/export/1 - backer', async (t) =>  {
    try {
        const exp = await request({
            url: 'http://localhost:4999/api/export/1',
            method: 'PATCH',
            json: true,
            headers: {
                'shared-secret': '123'
            },
            body: {
                size: 2134,
                status: 'Success',
                loglink: 'i-am-a-loglink'
            }
        });

        t.ok(exp.body.created, '.created: <date>');
        delete exp.body.created;
        t.ok(exp.body.expiry, '.expiry: <date>');
        delete exp.body.expiry;

        t.deepEquals(exp.body, {
            id: 1,
            uid: 1,
            job_id: 1,
            format: 'csv',
            size: 2134,
            status: 'Success',
            loglink: 'i-am-a-loglink'
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/export/1 - backer', async (t) =>  {
    try {
        const exp = await request({
            url: 'http://localhost:4999/api/export/1',
            method: 'GET',
            json: true,
            jar: usr.jar
        });

        t.ok(exp.body.created, '.created: <date>');
        delete exp.body.created;
        t.ok(exp.body.expiry, '.expiry: <date>');
        delete exp.body.expiry;

        t.deepEquals(exp.body, {
            id: 1,
            uid: 1,
            job_id: 1,
            format: 'csv',
            size: 2134,
            status: 'Success',
            loglink: 'i-am-a-loglink'
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('POST /api/export - backer - exceeded limit', async (t) =>  {
    try {
        const exp = await request({
            url: 'http://localhost:4999/api/export',
            method: 'POST',
            json: true,
            jar: usr.jar,
            body: {
                job_id: 1,
                format: 'csv'
            }
        });

        t.equals(exp.statusCode, 400, 'http: 400');

        t.deepEquals(exp.body, {
            status: 400,
            message: 'Reached Monthly Export Limit',
            messages: []
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

flight.landing(test);
