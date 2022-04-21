import test from 'node:test';
import Flight from './flight.js';
import memjs from 'memjs';
import assert from 'assert';

const flight = new Flight();

flight.init();
flight.takeoff({
    'no-cache': false
});

test('Meta: Insert Key', async () => {
    const client = memjs.Client.create();
    await client.set('data', JSON.stringify({ test: true }));
    assert.deepEqual(JSON.parse((await client.get('data')).value), {
        test: true
    });

    await client.quit();
});

test('DELETE: api/cache', async () => {
    try {
        const res = await flight.fetch('/api/cache', {
            method: 'DELETE',
            json: true,
            headers: {
                'shared-secret': '123'
            }
        }, true);

        assert.deepEqual(await res.body, {
            status: 200,
            message: 'Cache Flushed'
        });

        const client = memjs.Client.create();
        assert.deepEqual((await client.get('data')).value, null);
        await client.quit();

    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('Meta: Insert Key', async () => {
    const client = memjs.Client.create();

    try {
        await client.set('data', JSON.stringify({ test: true }));
        assert.deepEqual(JSON.parse((await client.get('data')).value), {
            test: true
        });

        await client.quit();
    } catch (err) {
        assert.ifError(err, 'no errors');
    }
});

test('DELETE: api/cache/data', async () => {
    try {
        const res = await flight.fetch('/api/cache/data', {
            method: 'DELETE',
            json: true,
            headers: {
                'shared-secret': '123'
            }
        }, true);

        assert.deepEqual(await res.body, {
            status: 200,
            message: 'Key Flushed'
        });

        const client = memjs.Client.create();
        assert.deepEqual((await client.get('data')).value, null);
        await client.quit();
    } catch (err) {
        assert.ifError(err);
    }
});

flight.landing();
