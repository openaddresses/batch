'use strict';

const test = require('tape');
const Level = require('../lib/level');
const User = require('../lib/user');
const Flight = require('./init');
const { Pool } = require('pg');

const flight = new Flight();

flight.init(test);

test('Level#all', async (t) =>  {
    const pool = new Pool({
        connectionString: 'postgres://postgres@localhost:5432/openaddresses_test'
    });

    const level = new Level();
    const user = new User(pool);

    const res = await level.all(user, 'nick@ingalls.ca');

    t.end();
});
