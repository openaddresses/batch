'use strict';

const test = require('tape');
const Level = require('../lib/level');
const Flight = require('./init');
const nock = require('nock');
const { promisify } = require('util');
const request = promisify(require('request'));
const moment = require('moment');

const flight = new Flight();

flight.init(test);
flight.takeoff(test);

test('Level#all', async (t) =>  {
    nock('https://api.opencollective.com')
        .post('/graphql/v2')
        .reply(200, {
            "data": {
                "account": {
                    "members": {
                        "nodes": [
                            {
                                "id": "1a47byg9-nxozdp8b-kwvpmjlv-03rek5w8",
                                "role": "BACKER",
                                "account": {
                                    "id": "dmvrwng4-kj03dpbj-4e9qz57o-yl9e8xba",
                                    "slug": "test-single",
                                    "transactions": {
                                        "nodes": [
                                            {
                                                "createdAt": moment().subtract(10, 'days').format('YYYY-MM-DD'),
                                                "netAmount": {
                                                    "value": -500,
                                                    "currency": "USD"
                                                }
                                            }
                                        ]
                                    },
                                    "email": "test-all@openaddresses.io"
                                }
                            }
                        ]
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
            uid: usr.user.id,
            level: 'basic',
            username: usr.user.username,
            email: usr.user.email,
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
            uid: usr.user.id,
            level: 'sponsor',
            username: usr.user.username,
            email: usr.user.email,
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
            "data": {
                "account": {
                    "members": {
                        "nodes": [
                            {
                                "id": "1a47byg9-nxozdp8b-kwvpmjlv-03rek5w8",
                                "role": "BACKER",
                                "account": {
                                    "id": "dmvrwng4-kj03dpbj-4e9qz57o-yl9e8xba",
                                    "slug": "test-single",
                                    "transactions": {
                                        "nodes": [
                                            {
                                                "createdAt": moment().subtract(10, 'days').format('YYYY-MM-DD'),
                                                "netAmount": {
                                                    "value": -50,
                                                    "currency": "USD"
                                                }
                                            }
                                        ]
                                    },
                                    "email": "test-single@openaddresses.io"
                                }
                            }
                        ]
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
            uid: usr.user.id,
            level: 'basic',
            username: usr.user.username,
            email: usr.user.email,
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
            uid: usr.user.id,
            level: 'backer',
            username: usr.user.username,
            email: usr.user.email,
            access: 'user',
            flags: {}
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('Level#user - no contrib', async (t) =>  {
    nock('https://api.opencollective.com')
        .post('/graphql/v2')
        .reply(200, {
            "data": {
                "account": {
                    "members": {
                        "nodes": [
                            {
                                "id": "1a47byg9-nxozdp8b-kwvpmjlv-03rek5w8",
                                "role": "BACKER",
                                "account": {
                                    "id": "dmvrwng4-kj03dpbj-4e9qz57o-yl9e8xba",
                                    "slug": "test-single1",
                                    "transactions": {
                                        "nodes": []
                                    },
                                    "email": "test-single1@openaddresses.io"
                                }
                            }
                        ]
                    }
                }
            }
        });


    const level = new Level(flight.pool);

    try {
        const usr = await flight.token('test-single1');

        const usr_pre = await request({
            url: 'http://localhost:4999/api/login',
            method: 'GET',
            json: true,
            jar: usr.jar
        });

        t.deepEquals(usr_pre.body, {
            uid: usr.user.id,
            level: 'basic',
            username: usr.user.username,
            email: usr.user.email,
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
            uid: usr.user.id,
            level: 'basic',
            username: usr.user.username,
            email: usr.user.email,
            access: 'user',
            flags: {}
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('Level#user - no match', async (t) =>  {
    nock('https://api.opencollective.com')
        .post('/graphql/v2')
        .reply(200, {
            "data": {
                "account": {
                    "members": {
                        "nodes": []
                    }
                }
            }
        });


    const level = new Level(flight.pool);

    try {
        const usr = await flight.token('test-single-none');

        const usr_pre = await request({
            url: 'http://localhost:4999/api/login',
            method: 'GET',
            json: true,
            jar: usr.jar
        });

        t.deepEquals(usr_pre.body, {
            uid: usr.user.id,
            level: 'basic',
            username: usr.user.username,
            email: usr.user.email,
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
            uid: usr.user.id,
            level: 'basic',
            username: usr.user.username,
            email: usr.user.email,
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
