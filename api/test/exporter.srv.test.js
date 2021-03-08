'use strict';

const test = require('tape');
const Flight = require('./init');
const { promisify } = require('util');
const request = promisify(require('request'));
const nock = require('nock');

const flight = new Flight();

flight.init(test);
flight.takeoff(test);

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
    nock('https://raw.githubusercontent.com')
        .get('/openaddresses/openaddresses/39e3218cee02100ce614e10812bdd74afa509dc4/sources/us/dc/statewide.json')
        .reply(200, require('./fixtures/dc-statewide.json'));

    try {
        const res = await request({
            url: 'http://localhost:4999/api/run/1/jobs',
            method: 'POST',
            json: true,
            headers: {
                'shared-secret': '123'
            },
            body: {
                jobs: [ 'https://raw.githubusercontent.com/openaddresses/openaddresses/39e3218cee02100ce614e10812bdd74afa509dc4/sources/us/dc/statewide.json' ]
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

test('POST /export - no donor level', async (t) =>  {
    try {
        const usr = await flight.token('test');

        const exp = await request({
            url: 'http://localhost:4999/api/export',
            method: 'post',
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

flight.landing(test);

test('close', (t) => {
    nock.cleanAll();
    nock.enableNetConnect();
    t.end();
});