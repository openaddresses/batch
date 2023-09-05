import User from '../lib/user.js';
import Token from '../lib/token.js';
import test from 'node:test';
import assert from 'assert';
import Flight from './flight.js';

const flight = new Flight();

flight.init();
flight.takeoff();

let TOKEN = '';

test('Token#generate', async () => {
    const authtoken = new Token(flight.config.pool);

    try {
        await authtoken.generate({
            type: 'token'
        });
        assert.fail('token.generate should fail');
    } catch (err) {
        assert.deepEqual(err.status, 400);
        assert.deepEqual(err.err, null);
        assert.deepEqual(err.safe, 'Only a user session can create a token');
    }

    try {
        await authtoken.generate({
            type: 'session'
        });
        assert.fail('token.generate should fail');
    } catch (err) {
        assert.deepEqual(err.status, 500);
        assert.deepEqual(err.err, null);
        assert.deepEqual(err.safe, 'Server could not determine user id');
    }

    try {
        await authtoken.generate({
            uid: 1,
            type: 'session'
        });
        assert.fail('token.generate should fail');
    } catch (err) {
        assert.deepEqual(err.status, 400);
        assert.deepEqual(err.err, null);
        assert.deepEqual(err.safe, 'Token name required');
    }

    try {
        const auth = new User(flight.config.pool);
        await auth.register({
            username: 'test',
            password: 'test',
            email: 'test@openaddresses.io'
        });

        const token = await authtoken.generate({
            uid: 1,
            type: 'session'
        }, 'New Token');

        TOKEN = token.token;
        assert.deepEqual(Object.keys(token).sort(), ['created', 'id', 'name', 'token'], 'token: <keys>');
        assert.equal(token.token.length, 67, 'token.token: <67 chars>');
        assert.equal(token.id, 1, 'token.id: 1');
        assert.ok(token.created, 'token.created: <date>');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('Token#list', async () => {
    const authtoken = new Token(flight.config.pool);

    try {
        await authtoken.list({
            type: 'session'
        });
        assert.fail('token.list should fail');
    } catch (err) {
        assert.deepEqual(err.status, 500);
        assert.deepEqual(err.err, null);
        assert.deepEqual(err.safe, 'Server could not determine user id');
    }

    try {
        const tokens = await authtoken.list({
            uid: 1,
            type: 'session'
        });

        assert.equal(tokens.total, 1, 'tokens.total: 1');
        assert.equal(tokens.tokens.length,  1, 'tokens.tokens.length: 1');
        assert.deepEqual(Object.keys(tokens.tokens[0]).sort(), ['created', 'id', 'name'], 'tokens[0]: <keys>');
        assert.ok(!tokens.tokens[0].token, 'tokens[0].token: <undefined>');
        assert.equal(tokens.tokens[0].id, 1, 'tokens[0].id: 1');
        assert.ok(tokens.tokens[0].created, 'tokens[0].created: <date>');
    } catch (err) {
        assert.ifError(err, 'no errors');
    }
});

test('Token#validate', async () => {
    const authtoken = new Token(flight.config.pool);

    try {
        await authtoken.validate('test');

        assert.fail('token.validate should fail');
    } catch (err) {
        assert.deepEqual(err.status, 401);
        assert.deepEqual(err.err, null);
        assert.deepEqual(err.safe, 'Invalid token');
    }

    try {
        // There is an infinitely small chance this test could pass if the random token matches this
        await authtoken.validate('oa.31a28cf8684a6b32566d096500b93f5bb5cb897bc7f227ba8932555d89cfb433');

        assert.fail('token.validate should fail');
    } catch (err) {
        assert.deepEqual(err.status, 401);
        assert.deepEqual(err.err, null);
        assert.deepEqual(err.safe, 'Invalid token');
    }

    try {
        const auth = await authtoken.validate(TOKEN);

        assert.equal(auth.uid, 1, 'auth.uid: 1');
        assert.equal(auth.username, 'test', 'auth.username: test');
        assert.equal(auth.access, 'user', 'auth.access: user');
        assert.equal(auth.email, 'test@openaddresses.io', 'auth.email: test@openaddresses.io');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('Token#delete', async () => {
    const authtoken = new Token(flight.config.pool);

    try {
        await authtoken.delete({
            type: 'session'
        });

        assert.fail('token.delete should fail');
    } catch (err) {
        assert.deepEqual(err.status, 500);
        assert.deepEqual(err.err, null);
        assert.deepEqual(err.safe, 'Server could not determine user id');
    }

    try {
        assert.deepEqual(await authtoken.delete({
            uid: 1,
            type: 'session'
        }, 1), {
            status: 200,
            message: 'Token Deleted'
        });
    } catch (err) {
        assert.ifError(err);
    }
});

flight.landing();
