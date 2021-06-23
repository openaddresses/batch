'use strict';

const fs = require('fs');
const path = require('path');
const test = require('tape');
const request = require('request');
const Flight = require('./init');
const memjs = require('memjs');

const flight = new Flight();

flight.init(test);
flight.takeoff(test);

test('Meta: Insert Key', async (t) => {
    const client = memjs.Client.create();
    await client.set('data', JSON.stringify({ test: true }));
    t.deepEquals(JSON.parse((await client.get('data')).value), {
        test: true
    });

    await client.quit();

    t.end();
});

test('DELETE: api/cache', (t) => {
    request({
        url: 'http://localhost:4999/api/cache',
        method: 'DELETE',
        json: true,
        headers: {
            'shared-secret': '123'
        }
    }, async (err, res) => {
        t.error(err, 'no error');

        t.deepEquals(res.body, {
            status: 200,
            message: 'Cache Flushed'
        });

        const client = memjs.Client.create();
        t.deepEquals((await client.get('data')).value, null);
        await client.quit();

        t.end();
    });
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

test('DELETE: api/cache/data', (t) => {
    request({
        url: 'http://localhost:4999/api/cache/data',
        method: 'DELETE',
        json: true,
        headers: {
            'shared-secret': '123'
        }
    }, async (err, res) => {
        t.error(err, 'no error');

        t.deepEquals(res.body, {
            status: 200,
            message: 'Key Flushed'
        });

        const client = memjs.Client.create();
        t.deepEquals((await client.get('data')).value, null);
        await client.quit();

        t.end();
    });
});

flight.landing(test);
