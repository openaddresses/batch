import test from 'node:test';
import assert from 'assert';
import Level from '../lib/level.js';
import LevelOverride from '../lib/types/level-override.js';
import Flight from './flight.js';
import nock from 'nock';
import moment from 'moment';

const flight = new Flight();

flight.init();
flight.takeoff();
flight.user('test_all');

test('Level#all', async () =>  {
    nock('https://api.opencollective.com')
        .post('/graphql/v2')
        .reply(200, {
            'data': {
                'account': {
                    'members': {
                        'nodes': [
                            {
                                'id': '1a47byg9-nxozdp8b-kwvpmjlv-03rek5w8',
                                'role': 'BACKER',
                                'account': {
                                    'id': 'dmvrwng4-kj03dpbj-4e9qz57o-yl9e8xba',
                                    'slug': 'test_single',
                                    'transactions': {
                                        'nodes': [
                                            {
                                                'createdAt': moment().subtract(10, 'days').format('YYYY-MM-DD'),
                                                'netAmount': {
                                                    'value': -500,
                                                    'currency': 'USD'
                                                }
                                            }
                                        ]
                                    },
                                    'email': 'test_all@openaddresses.io'
                                }
                            }
                        ]
                    }
                }
            }
        });


    const level = new Level(flight.config.pool);

    try {
        const usr_pre = await flight.fetch('/api/login', {
            auth: {
                bearer: flight.token.test_all
            },
            method: 'GET'
        }, true);

        assert.equal(usr_pre.body.level, 'basic');

        await level.all();

        const usr_post = await flight.fetch('/api/login', {
            method: 'GET',
            auth: {
                bearer: flight.token.test_all
            }
        }, true);

        assert.deepEqual(usr_post.body.level, 'sponsor');
    } catch (err) {
        assert.ifError(err, 'no errors');
    }
});

flight.user('hello');


test('Level#user - override', async () =>  {
    const level = new Level(flight.config.pool);

    await LevelOverride.generate(flight.config.pool, {
        pattern: '^hello@openaddresses.io$',
        level: 'sponsor'
    });

    try {
        const usr_pre = await flight.fetch('/api/login', {
            method: 'GET',
            auth: {
                bearer: flight.token.hello
            }
        }, true);

        assert.deepEqual(usr_pre.body.level, 'basic');

        await level.single('hello@openaddresses.io');

        const usr_post = await flight.fetch('/api/login', {
            method: 'GET',
            auth: {
                bearer: flight.token.hello
            }
        }, true);

        assert.deepEqual(usr_post.body.level, 'sponsor');
    } catch (err) {
        assert.ifError(err, 'no errors');
    }
});

flight.user('test_single');

test('Level#user', async () =>  {
    nock('https://api.opencollective.com')
        .post('/graphql/v2')
        .reply(200, {
            'data': {
                'account': {
                    'members': {
                        'nodes': [
                            {
                                'id': '1a47byg9-nxozdp8b-kwvpmjlv-03rek5w8',
                                'role': 'BACKER',
                                'account': {
                                    'id': 'dmvrwng4-kj03dpbj-4e9qz57o-yl9e8xba',
                                    'slug': 'test_single',
                                    'transactions': {
                                        'nodes': [
                                            {
                                                'createdAt': moment().subtract(10, 'days').format('YYYY-MM-DD'),
                                                'netAmount': {
                                                    'value': -50,
                                                    'currency': 'USD'
                                                }
                                            }
                                        ]
                                    },
                                    'email': 'test_single@openaddresses.io'
                                }
                            }
                        ]
                    }
                }
            }
        });


    const level = new Level(flight.config.pool);

    try {
        const usr_pre = await flight.fetch('/api/login', {
            auth: {
                bearer: flight.token.test_single
            },
            method: 'GET'
        }, true);

        assert.deepEqual(usr_pre.body.level, 'basic');

        await level.single('test_single@openaddresses.io');

        const usr_post = await flight.fetch('/api/login', {
            method: 'GET',
            auth: {
                bearer: flight.token.test_single
            }
        }, true);

        assert.deepEqual(usr_post.body.level, 'backer');
    } catch (err) {
        assert.ifError(err, 'no errors');
    }
});

flight.user('test_single1');

test('Level#user - no contrib', async () =>  {
    nock('https://api.opencollective.com')
        .post('/graphql/v2')
        .reply(200, {
            'data': {
                'account': {
                    'members': {
                        'nodes': [
                            {
                                'id': '1a47byg9-nxozdp8b-kwvpmjlv-03rek5w8',
                                'role': 'BACKER',
                                'account': {
                                    'id': 'dmvrwng4-kj03dpbj-4e9qz57o-yl9e8xba',
                                    'slug': 'test_single1',
                                    'transactions': {
                                        'nodes': []
                                    },
                                    'email': 'test_single1@openaddresses.io'
                                }
                            }
                        ]
                    }
                }
            }
        });


    const level = new Level(flight.config.pool);

    try {
        const usr_pre = await flight.fetch('/api/login', {
            method: 'GET',
            auth: {
                bearer: flight.token.test_single1
            }
        }, true);

        assert.deepEqual(usr_pre.body.level, 'basic');

        await level.single('test_single1@openaddresses.io');

        const usr_post = await flight.fetch('/api/login', {
            method: 'GET',
            auth: {
                bearer: flight.token.test_single1
            }
        }, true);

        assert.deepEqual(usr_post.body.level, 'basic');
    } catch (err) {
        assert.ifError(err, 'no errors');
    }
});

flight.user('test_single_none');

test('Level#user - no match', async () =>  {
    nock('https://api.opencollective.com')
        .post('/graphql/v2')
        .reply(200, {
            'data': {
                'account': {
                    'members': {
                        'nodes': []
                    }
                }
            }
        });


    const level = new Level(flight.config.pool);

    try {
        const usr_pre = await flight.fetch('/api/login', {
            method: 'GET',
            auth: {
                bearer: flight.token.test_single_none
            }
        }, true);

        assert.deepEqual(usr_pre.body.level, 'basic');

        await level.single('test_single_none@openaddresses.io');

        const usr_post = await flight.fetch('/api/login', {
            method: 'GET',
            auth: {
                bearer: flight.token.test_single_none
            }
        }, true);

        assert.deepEqual(usr_post.body.level, 'basic');
    } catch (err) {
        assert.ifError(err, 'no errors');
    }
});

flight.user('test_null_account');

test('Level#single - null account node does not crash', async () => {
    // Reproduces the production crash: OC returns a node where account is null
    // (deleted/deactivated OC account). Before the fix this threw:
    //   TypeError: Cannot read properties of null (reading 'email')
    nock('https://api.opencollective.com')
        .post('/graphql/v2')
        .reply(200, {
            'data': {
                'account': {
                    'members': {
                        'nodes': [
                            {
                                'id': 'null-account-node',
                                'role': 'BACKER',
                                'account': null
                            },
                            {
                                'id': '1a47byg9-nxozdp8b-kwvpmjlv-03rek5w8',
                                'role': 'BACKER',
                                'account': {
                                    'id': 'dmvrwng4-kj03dpbj-4e9qz57o-yl9e8xba',
                                    'slug': 'test_null_account',
                                    'transactions': {
                                        'nodes': [
                                            {
                                                'createdAt': moment().subtract(10, 'days').format('YYYY-MM-DD'),
                                                'netAmount': {
                                                    'value': -50,
                                                    'currency': 'USD'
                                                }
                                            }
                                        ]
                                    },
                                    'email': 'test_null_account@openaddresses.io'
                                }
                            }
                        ]
                    }
                }
            }
        });

    const level = new Level(flight.config.pool);

    try {
        const usr_pre = await flight.fetch('/api/login', {
            method: 'GET',
            auth: { bearer: flight.token.test_null_account }
        }, true);

        assert.equal(usr_pre.body.level, 'basic');

        // Should not throw despite the null account node
        await level.single('test_null_account@openaddresses.io');

        const usr_post = await flight.fetch('/api/login', {
            method: 'GET',
            auth: { bearer: flight.token.test_null_account }
        }, true);

        // Valid node was still processed correctly
        assert.equal(usr_post.body.level, 'backer');
    } catch (err) {
        assert.ifError(err, 'no errors');
    }
});

flight.user('test_oc_error');

test('Level#single - OC API error response does not crash profile page', async () => {
    // When OC returns a non-ok response (expired key, rate limit, etc.),
    // level.single() should throw a proper Err rather than a cryptic TypeError,
    // and login.js wraps it so the profile page still loads.
    nock('https://api.opencollective.com')
        .post('/graphql/v2')
        .reply(401, {
            'errors': [{ 'message': 'Invalid API key' }]
        });

    const level = new Level(flight.config.pool);

    // level.single() itself should throw (proper Err, not TypeError)
    await assert.rejects(
        () => level.single('test_oc_error@openaddresses.io'),
        (err) => {
            assert.ok(err.message.includes('OpenCollective API Error'), `expected OC error message, got: ${err.message}`);
            return true;
        }
    );

    // But the profile endpoint wraps it and should still return 200
    const res = await flight.fetch('/api/login?level=true', {
        method: 'GET',
        auth: { bearer: flight.token.test_oc_error }
    }, true);

    assert.equal(res.status, 200, 'profile page should return 200 even when OC is down');
    assert.equal(res.body.level, 'basic');
});

flight.user('test_all_null');

test('Level#all - null account node is skipped, valid nodes still processed', async () => {
    // Level.all() was using return instead of continue so a null account node
    // would abort the entire refresh loop. Also accessing usr.account.x on null crashed.
    nock('https://api.opencollective.com')
        .post('/graphql/v2')
        .reply(200, {
            'data': {
                'account': {
                    'members': {
                        'nodes': [
                            {
                                'id': 'null-node',
                                'role': 'BACKER',
                                'account': null
                            },
                            {
                                'id': 'valid-node',
                                'role': 'BACKER',
                                'account': {
                                    'id': 'some-id',
                                    'slug': 'test_all_null',
                                    'transactions': {
                                        'nodes': [
                                            {
                                                'createdAt': moment().subtract(10, 'days').format('YYYY-MM-DD'),
                                                'netAmount': {
                                                    'value': -500,
                                                    'currency': 'USD'
                                                }
                                            }
                                        ]
                                    },
                                    'email': 'test_all_null@openaddresses.io'
                                }
                            }
                        ]
                    }
                }
            }
        });

    const level = new Level(flight.config.pool);

    try {
        const usr_pre = await flight.fetch('/api/login', {
            method: 'GET',
            auth: { bearer: flight.token.test_all_null }
        }, true);

        assert.equal(usr_pre.body.level, 'basic');

        // Should not throw, and should not abort early due to the null node
        await level.all();

        const usr_post = await flight.fetch('/api/login', {
            method: 'GET',
            auth: { bearer: flight.token.test_all_null }
        }, true);

        assert.equal(usr_post.body.level, 'sponsor');
    } catch (err) {
        assert.ifError(err, 'no errors');
    }
});

flight.landing();

test('close', () => {
    nock.cleanAll();
    nock.enableNetConnect();
});
