'use strict';

const test = require('tape');
const Flight = require('./init');
const { promisify } = require('util');
const request = promisify(require('request'));

const flight = new Flight();

flight.init(test);
flight.takeoff(test);

test('POST /export - no donor level', async (t) =>  {

    try {
        const usr = await flight.token('test');

        const usr_pre = await request({
            url: 'http://localhost:4999/export',
            method: 'post',
            json: true,
            jar: usr.jar,
            body: {
                job: 1
            }
        });

        t.deepEquals(usr_pre.body, {
            uid: usr.user.id,
            level: 'basic',
            username: usr.user.username,
            email: usr.user.email,
            access: 'user',
            flags: {}
        });

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

flight.landing(test);
