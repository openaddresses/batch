import test from 'node:test';
import assert from 'assert';
import Flight from './flight.js';

const flight = new Flight();

flight.init();
flight.takeoff();
flight.user('sponsor', false, { level: 'sponsor' });
flight.user('basic');

test('POST: api/run', async () => {
    try {
        const res = await flight.fetch('/api/run', {
            method: 'POST',
            headers: { 'shared-secret': '123' },
            body: { live: true },
        }, true);

        assert.equal(res.body.id, 1, 'run.id: 1');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('POST: api/run/1/jobs', async () => {
    try {
        const res = await flight.fetch('/api/run/1/jobs', {
            method: 'POST',
            headers: { 'shared-secret': '123' },
            body: {
                jobs: ['https://raw.githubusercontent.com/openaddresses/openaddresses/39e3218cee02100ce614e10812bdd74afa509dc4/sources/us/dc/statewide.json'],
            },
        }, false);

        assert.deepEqual(res.body.jobs, [1], 'jobs: [1]');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('PATCH: api/job/1 -> Success with validated output', async () => {
    try {
        const res = await flight.fetch('/api/job/1', {
            method: 'PATCH',
            headers: { 'shared-secret': '123' },
            body: {
                status: 'Success',
                output: {
                    cache: true,
                    output: true,
                    preview: true,
                    validated: true,
                },
            },
        }, false);

        assert.equal(res.body.status, 'Success', 'job.status: Success');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

// Browser downloads are plain links and can't send an Authorization header,
// so the web UI authenticates them with a ?token= query param
test('GET: api/job/1/output/validated.geojson.gz - sponsor via ?token=', async () => {
    try {
        const res = await fetch(new URL(`/api/job/1/output/validated.geojson.gz?token=${flight.token.sponsor}`, flight.base || undefined), {
            redirect: 'manual',
        });

        assert.equal(res.status, 302, 'redirects to download');
        assert.match(String(res.headers.get('location')), /\/job\/1\/validated\.geojson\.gz$/);
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: api/job/1/output/validated.geojson.gz - sponsor via Authorization header', async () => {
    try {
        const res = await fetch(new URL('/api/job/1/output/validated.geojson.gz', flight.base || undefined), {
            redirect: 'manual',
            headers: { Authorization: `Bearer ${flight.token.sponsor}` },
        });

        assert.equal(res.status, 302, 'redirects to download');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: api/job/1/output/validated.geojson.gz - basic user via ?token= is refused', async () => {
    try {
        const res = await fetch(new URL(`/api/job/1/output/validated.geojson.gz?token=${flight.token.basic}`, flight.base || undefined), {
            redirect: 'manual',
        });

        assert.equal(res.status, 403);
        assert.equal((await res.json() as { message: string }).message, 'Please donate to use this feature');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('GET: api/job/1/output/validated.geojson.gz - unauthenticated is refused', async () => {
    try {
        const res = await fetch(new URL('/api/job/1/output/validated.geojson.gz', flight.base || undefined), {
            redirect: 'manual',
        });

        assert.equal(res.status, 403);
        assert.equal((await res.json() as { message: string }).message, 'Authentication Required');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

flight.landing();
