'use strict';

const Bunny = require('../lib/bunny');
const tape = require('tape');

tape('Bunny#sign', (t) => {
    const bunny = new Bunny('123');

    t.equals(
        bunny.sign('https://v2.openaddresses.io/batch-prod/collection-global.zip', 1609484400),
        'https://v2.openaddresses.io/batch-prod/collection-global.zip?token=82EYgkUPhv%2FL9szDzOkUU8Lqw4m8%2F35j3qXyX0zXaX4%3D&expires=1609484400',
        'expected token'
    );

    t.end();
});
