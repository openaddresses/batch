import test from 'tape';
import Flight from './flight.js';
import memjs from 'memjs';

const flight = new Flight();

flight.init(test);
flight.takeoff(test, {
    'no-cache': false
});

test('Meta: Insert Key', async (t) => {
    const client = memjs.Client.create();
    await client.set('data', JSON.stringify({ test: true }));
    t.deepEquals(JSON.parse((await client.get('data')).value), {
        test: true
    });

    await client.quit();

    t.end();
});

test('DELETE: api/cache', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/cache',
            method: 'DELETE',
            json: true,
            headers: {
                'shared-secret': '123'
            }
        }, t);

        t.deepEquals(res.body, {
            status: 200,
            message: 'Cache Flushed'
        });

        const client = memjs.Client.create();
        t.deepEquals((await client.get('data')).value, null);
        await client.quit();

    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('Meta: Insert Key', async (t) => {
    const client = memjs.Client.create();

    try {
        await client.set('data', JSON.stringify({ test: true }));
        t.deepEquals(JSON.parse((await client.get('data')).value), {
            test: true
        });

        await client.quit();
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('DELETE: api/cache/data', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/cache/data',
            method: 'DELETE',
            json: true,
            headers: {
                'shared-secret': '123'
            }
        }, t);

        t.deepEquals(res.body, {
            status: 200,
            message: 'Key Flushed'
        });

        const client = memjs.Client.create();
        t.deepEquals((await client.get('data')).value, null);
        await client.quit();
    } catch (err) {
        t.error(err, 'no error');
    }
});

flight.landing(test);
