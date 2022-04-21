import test from 'node:test';
import assert from 'assert';
import Level from '../lib/level.js';
import LevelOverride from '../lib/level-override.js';
import Flight from './flight.js';
import nock from 'nock';
import moment from 'moment';

const flight = new Flight();

flight.init();
flight.takeoff();
flight.user('test_all');

test('Level#all', async (t) =>  {
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

flight.user(test, 'hello');


test('Level#user - override', async (t) =>  {
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
            },
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

test('Level#user', async (t) =>  {
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
            method: 'GET',
        }, t);

        assert.deepEqual(usr_pre.body.level, 'basic');

        await level.single('test_single@openaddresses.io');

        const usr_post = await flight.fetch({
            url: '/api/login',
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

test('Level#user - no contrib', async (t) =>  {
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

test('Level#user - no match', async (t) =>  {
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
        }, t);

        assert.deepEqual(usr_pre.body.level, 'basic');

        await level.single('test_single_none@openaddresses.io');

        const usr_post = await flight.fetch('/api/login', {
            method: 'GET',
            auth: {
                bearer: flight.token.test_single_none
            }
        }, t);

        assert.deepEqual(usr_post.body.level, 'basic');
    } catch (err) {
        assert.ifError(err, 'no errors');
    }
});

flight.landing();

test('close', (t) => {
    nock.cleanAll();
    nock.enableNetConnect();
});
