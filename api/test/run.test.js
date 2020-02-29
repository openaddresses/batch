const fs = require('fs');
const path = require('path');
const {Pool} = require('pg')
const srv = require('../index.js');
const test = require('tape');
const request = require('request');
let app;

test('start', async (t) => {
    let pool = new Pool({
        connectionString: 'postgres://postgres@localhost:5432/postgres'
    });

    try {
        await pool.query('DROP DATABASE IF EXISTS openaddresses_test');
        await pool.query('CREATE DATABASE openaddresses_test');
        await pool.end()
    } catch(err) {
        t.error(err);
    }

    pool = new Pool({
        connectionString: 'postgres://postgres@localhost:5432/openaddresses_test'
    });

    try {
        await pool.query(String(fs.readFileSync(path.resolve(__dirname, '../schema.sql'))));
    } catch(err) {
        t.error(err);
    }

    srv({
        postgres: 'postgres://postgres@localhost:5432/openaddresses_test'
    }, (a) => {
        app = a;
        t.end();
    });
});

test('POST: api/run', (t) => {
    request({
        url: 'http://localhost:5000/api/run',
        method: 'POST',
        json: true,
    }, (err, res) => {
        t.error(err);

        t.equals(res.body.id, 1)
        t.ok(res.body.created)
        t.deepEquals(res.body.github, {});
        t.deepEquals(res.body.closed, false);

        t.end();
    });
});

test('GET: api/run', (t) => {
    request({
        url: 'http://localhost:5000/api/run',
        method: 'GET',
        json: true,
    }, (err, res) => {
        t.error(err);

        t.equals(res.body.length, 1);
        t.deepEquals(Object.keys(res.body[0]).sort(), [
            'id',
            'created',
            'github',
            'closed'
        ].sort());
        t.equals(res.body[0].id, 1)
        t.ok(res.body[0].created)
        t.deepEquals(res.body[0].github, {});
        t.deepEquals(res.body[0].closed, false);

        t.end();
    });
})

test('POST: api/run/:run/jobs', (t) => {
    request({
        url: `http://localhost:5000/api/run/1/jobs`,
        method: 'POST',
        json: true,
        body: {
            jobs: [
                'https://raw.githubusercontent.com/openaddresses/openaddresses/39e3218cee02100ce614e10812bdd74afa509dc4/sources/us/dc/statewide.json'
            ]
        }
    }, (err, res) => {
        t.error(err);

        t.deepEquals(res.body, {
            jobs: [ 1 ]
        });
        t.end();
    });
})

test('stop', (t) => {
    app.close();
    t.end();
});
