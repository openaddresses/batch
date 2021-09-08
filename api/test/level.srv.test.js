'use strict';

const test = require('tape');
const Level = require('../lib/level');
const Flight = require('./flight');
const nock = require('nock');
const moment = require('moment');

const flight = new Flight();

flight.init(test);
flight.takeoff(test);
flight.user(test, 'test_all');

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
        const usr_pre = await flight.request({
            url: 'http://localhost:4999/api/login',
            auth: {
                bearer: flight.token.test_all
            },
            method: 'GET',
            json: true
        }, t);

        t.equals(usr_pre.body.level, 'basic');

        await level.all();

        const usr_post = await flight.request({
            url: 'http://localhost:4999/api/login',
            method: 'GET',
            auth: {
                bearer: flight.token.test_all
            },
            json: true
        }, t);

        t.deepEquals(usr_post.body.level, 'sponsor');
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

flight.user(test, 'hello');


test('Level#user - override', async (t) =>  {
    const level = new Level(flight.config.pool);

    try {
        const usr_pre = await flight.request({
            url: 'http://localhost:4999/api/login',
            method: 'GET',
            auth: {
                bearer: flight.token.hello
            },
            json: true
        }, t);

        t.deepEquals(usr_pre.body.level, 'basic');

        await level.single('hello@openaddresses.io');

        const usr_post = await flight.request({
            url: 'http://localhost:4999/api/login',
            method: 'GET',
            auth: {
                bearer: flight.token.hello
            },
            json: true
        }, t);

        t.deepEquals(usr_post.body.level, 'sponsor');
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

flight.user(test, 'test_single');

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
        const usr_pre = await flight.request({
            url: 'http://localhost:4999/api/login',
            auth: {
                bearer: flight.token.test_single
            },
            method: 'GET',
            json: true
        }, t);

        t.deepEquals(usr_pre.body.level, 'basic');

        await level.single('test_single@openaddresses.io');

        const usr_post = await flight.request({
            url: 'http://localhost:4999/api/login',
            method: 'GET',
            auth: {
                bearer: flight.token.test_single
            },
            json: true
        }, t);

        t.deepEquals(usr_post.body.level, 'backer');
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

flight.user(test, 'test_single1');

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
        const usr_pre = await flight.request({
            url: 'http://localhost:4999/api/login',
            method: 'GET',
            json: true,
            auth: {
                bearer: flight.token.test_single1
            }
        }, t);

        t.deepEquals(usr_pre.body.level, 'basic');

        await level.single('test_single1@openaddresses.io');

        const usr_post = await flight.request({
            url: 'http://localhost:4999/api/login',
            method: 'GET',
            json: true,
            auth: {
                bearer: flight.token.test_single1
            }
        }, t);

        t.deepEquals(usr_post.body.level, 'basic');
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

flight.user(test, 'test_single_none');

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
        const usr_pre = await flight.request({
            url: 'http://localhost:4999/api/login',
            method: 'GET',
            json: true,
            auth: {
                bearer: flight.token.test_single_none
            }
        }, t);

        t.deepEquals(usr_pre.body.level, 'basic');

        await level.single('test_single_none@openaddresses.io');

        const usr_post = await flight.request({
            url: 'http://localhost:4999/api/login',
            method: 'GET',
            json: true,
            auth: {
                bearer: flight.token.test_single_none
            }
        }, t);

        t.deepEquals(usr_post.body.level, 'basic');
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

flight.landing(test);

test('close', (t) => {
    nock.cleanAll();
    nock.enableNetConnect();
    t.end();
});
