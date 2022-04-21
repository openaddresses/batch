import test from 'node:test';
import assert from 'assert';
import Flight from './flight.js';

const flight = new Flight();

flight.init();
flight.takeoff({
    limit: {
        exports: 1
    }
});

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
                jobs: [{
                    source: 'https://raw.githubusercontent.com/openaddresses/openaddresses/39e3218cee02100ce614e10812bdd74afa509dc4/sources/us/dc/statewide.json',
                    layer: 'addresses',
                    name: 'dcgis'
                }]
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

flight.user('backer', false, {
    level: 'backer'
});

test('POST /api/export - cannot export unsuccessful', async () =>  {
    try {
        const exp = await flight.fetch('/api/export', {
            method: 'POST',
            auth: {
                bearer: flight.token.backer
            },
            body: {
                job_id: 1,
                format: 'csv'
            }
        }, false);

        assert.equal(exp.status, 400, 'http: 400');

        assert.deepEqual(exp.body, {
            status: 400,
            message: 'Cannot export a job that was not successful',
            messages: []
        });
    } catch (err) {
        assert.ifError(err, 'no errors');
    }
});

test('PATCH /api/job/1', async () =>  {
    try {
        await flight.fetch('/api/job/1', {
            method: 'PATCH',
            headers: {
                'shared-secret': '123'
            },
            body: {
                status: 'Success'
            }
        }, true);
    } catch (err) {
        assert.ifError(err, 'no errors');
    }
});

flight.user('non_backer');

test('POST /api/export - no donor level', async () =>  {
    try {

        const exp = await flight.fetch('/api/export', {
            method: 'POST',
            auth: {
                bearer: flight.token.non_backer
            },
            body: {
                job_id: 1,
                format: 'csv'
            }
        }, false);

        assert.deepEqual(exp.body, {
            status: 403,
            message: 'Please donate to use this feature',
            messages: []
        });
    } catch (err) {
        assert.ifError(err, 'no errors');
    }
});

test('POST /api/export - backer', async () =>  {
    try {
        const exp = await flight.fetch('/api/export', {
            method: 'POST',
            auth: {
                bearer: flight.token.backer
            },
            body: {
                job_id: 1,
                format: 'csv'
            }
        }, true);

        assert.ok(exp.body.created, '.created: <date>');
        delete exp.body.created;
        assert.ok(exp.body.expiry, '.expiry: <date>');
        delete exp.body.expiry;

        assert.deepEqual(exp.body, {
            id: 1,
            uid: 1,
            job_id: 1,
            size: null,
            status: 'Pending',
            format: 'csv',
            loglink: null
        });
    } catch (err) {
        assert.ifError(err, 'no errors');
    }
});

test('GET /api/export - backer', async () =>  {
    try {
        const exp = await flight.fetch('/api/export', {
            method: 'GET',
            auth: {
                bearer: flight.token.backer
            }
        }, true);

        assert.ok(exp.body.exports[0].created, '.exports[0].created: <date>');
        delete exp.body.exports[0].created;
        assert.ok(exp.body.exports[0].expiry, '.exports[0].expiry: <date>');
        delete exp.body.exports[0].expiry;

        assert.deepEqual(exp.body, {
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
        assert.ifError(err, 'no errors');
    }
});

test('GET /api/export/100 - backer', async () =>  {
    try {
        const exp = await flight.fetch('/api/export/100', {
            auth: {
                bearer: flight.token.backer
            },
            method: 'GET'
        }, false);

        assert.deepEqual(exp.body, { status: 404, message: 'exports not found', messages: [] });
    } catch (err) {
        assert.ifError(err, 'no errors');
    }
});

test('PATCH /api/export/1 - backer', async () =>  {
    try {
        const exp = await flight.fetch('/api/export/1', {
            method: 'PATCH',
            headers: {
                'shared-secret': '123'
            },
            body: {
                size: 2134,
                status: 'Success',
                loglink: 'i-am-a-loglink'
            }
        }, true);

        assert.ok(exp.body.created, '.created: <date>');
        delete exp.body.created;
        assert.ok(exp.body.expiry, '.expiry: <date>');
        delete exp.body.expiry;

        assert.deepEqual(exp.body, {
            id: 1,
            uid: 1,
            job_id: 1,
            format: 'csv',
            size: 2134,
            status: 'Success',
            loglink: 'i-am-a-loglink'
        });
    } catch (err) {
        assert.ifError(err, 'no errors');
    }
});

test('GET /api/export/1 - backer', async () =>  {
    try {
        const exp = await flight.fetch('/api/export/1', {
            method: 'GET',
            auth: {
                bearer: flight.token.backer
            }
        }, true);

        assert.ok(exp.body.created, '.created: <date>');
        delete exp.body.created;
        assert.ok(exp.body.expiry, '.expiry: <date>');
        delete exp.body.expiry;

        assert.deepEqual(exp.body, {
            id: 1,
            uid: 1,
            job_id: 1,
            format: 'csv',
            size: 2134,
            status: 'Success',
            loglink: 'i-am-a-loglink'
        });
    } catch (err) {
        assert.ifError(err, 'no errors');
    }
});

test('POST /api/export - backer - exceeded limit', async () =>  {
    try {
        const exp = await flight.fetch('/api/export', {
            method: 'POST',
            auth: {
                bearer: flight.token.backer
            },
            body: {
                job_id: 1,
                format: 'csv'
            }
        }, false);

        assert.equal(exp.status, 400, 'http: 400');

        assert.deepEqual(exp.body, {
            status: 400,
            message: 'Reached Monthly Export Limit',
            messages: []
        });
    } catch (err) {
        assert.ifError(err, 'no errors');
    }
});

flight.landing(test);
