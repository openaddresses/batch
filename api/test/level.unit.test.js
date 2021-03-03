const test = require('tape');
const Level = require('../lib/level');

test('Level#get_user', async (t) =>  {
    const level = new Level();

    const res = await level.get_user({
        email: 'nick@ingalls.ca'
    });

    console.error(res);
});
