'use strict';

const { Auth, AuthToken } = require('../lib/auth');
const test = require('tape');
const { Pool } = require('pg');
const init = require('./init');

init(test);

test('AuthToken#generate', async (t) => {
    const pool = new Pool({
        connectionString: 'postgres://postgres@localhost:5432/openaddresses_test'
    });

    const authtoken = new AuthToken(pool);

    try {
        await authtoken.generate({
            type: 'token'
        });
        t.fail('token.generate should fail');
    } catch (err) {
        t.deepEquals(err, {
            status: 400,
            err: null,
            safe: 'Only a user session can create a token'
        }, 'Only a user session can create a token');
    }

    try {
        await authtoken.generate({
            type: 'session'
        });
        t.fail('token.generate should fail');
    } catch (err) {
        t.deepEquals(err, {
            status: 500,
            err: null,
            safe: 'Server could not determine user id'
        }, 'Server could not determine user id');
    }

    try {
        const token = await authtoken.generate({
            uid: 1,
            type: 'session'
        });

        t.equals(token.token.length, 67, 'token.token: <67 chars>');
        t.equals(token.id, 1, 'token.id: 1');
        t.ok(token.created, 'token.created: <date>');
    } catch (err) {
        t.error(err, 'no error');
    }

    pool.end();
    t.end();
});

test('AuthToken#list', async (t) => {
    const pool = new Pool({
        connectionString: 'postgres://postgres@localhost:5432/openaddresses_test'
    });

    const authtoken = new AuthToken(pool);

    try {
        await authtoken.list({
            type: 'session'
        });
        t.fail('token.list should fail');
    } catch (err) {
        t.deepEquals(err, {
            status: 500,
            err: null,
            safe: 'Server could not determine user id'
        }, 'Server could not determine user id');
    }

    try {
        const tokens = await authtoken.list({
            uid: 1,
            type: 'session'
        });

        t.equals(tokens.length, 1, 'tokens.length: 1');
        t.notOk(tokens[0].token, 'tokens[0].token: <undefined>')
        t.equals(tokens[0].id, 1, 'tokens[0].id: 1');
        t.ok(tokens[0].created, 'tokens[0].created: <date>');
    } catch (err) {
        t.error(err, 'no errors');
    }

    pool.end();
    t.end();
});

test('AuthToken#delete', (t) => {
    t.end();
});

test('AuthToken#validate', (t) => {
    t.end();
});
