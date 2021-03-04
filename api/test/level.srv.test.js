'use strict';

const test = require('tape');
const Level = require('../lib/level');
const Flight = require('./init');
const nock = require('nock');
const { promisify } = require('util');
const request = promisify(require('request'));

const flight = new Flight();

flight.init(test);
flight.takeoff(test);

test('Level#all', async (t) =>  {
    nock('https://api.opencollective.com')
        .post('/graphql/v2')
        .reply(200, {
            'data': {
                'account': {
                    'members': {
                        'nodes': [{
                            'id': 'fake',
                            'role': 'SPONSOR',
                            'account': {
                                'id': 'fake',
                                'slug': 'test',
                                'email': 'test-all@openaddresses.io'
                            }
                        }]
                    }
                }
            }
        });


    const level = new Level(flight.pool);

    try {
        const usr = await flight.token('test-all');

        const usr_pre = await request({
            url: 'http://localhost:4999/api/login',
            method: 'GET',
            json: true,
            jar: usr.jar
        });

        t.deepEquals(usr_pre.body, {
            uid: 1,
            level: 'basic',
            username: 'test-all',
            email: 'test-all@openaddresses.io',
            access: 'user',
            flags: {}
        });

        await level.all();

        const usr_post = await request({
            url: 'http://localhost:4999/api/login',
            method: 'GET',
            json: true,
            jar: usr.jar
        });

        t.deepEquals(usr_post.body, {
            uid: 1,
            level: 'sponsor',
            username: 'test-all',
            email: 'test-all@openaddresses.io',
            access: 'user',
            flags: {}
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('Level#user', async (t) =>  {
    nock('https://api.opencollective.com')
        .post('/graphql/v2')
        .reply(200, {
            'data': {
                'account': {
                    'members': {
                        'nodes': [{
                            'id': 'fake',
                            'role': 'BACKER',
                            'account': {
                                'id': 'fake',
                                'slug': 'test',
                                'email': 'test-single@openaddresses.io'
                            }
                        }]
                    }
                }
            }
        });


    const level = new Level(flight.pool);

    try {
        const usr = await flight.token('test-single');

        const usr_pre = await request({
            url: 'http://localhost:4999/api/login',
            method: 'GET',
            json: true,
            jar: usr.jar
        });

        t.deepEquals(usr_pre.body, {
            uid: 2,
            level: 'basic',
            username: 'test-single',
            email: 'test-single@openaddresses.io',
            access: 'user',
            flags: {}
        });

        await level.single(usr.email);

        const usr_post = await request({
            url: 'http://localhost:4999/api/login',
            method: 'GET',
            json: true,
            jar: usr.jar
        });

        t.deepEquals(usr_post.body, {
            uid: 2,
            level: 'backer',
            username: 'test-single',
            email: 'test-single@openaddresses.io',
            access: 'user',
            flags: {}
        });
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
