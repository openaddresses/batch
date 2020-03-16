const test = require('tape');
const task = require('../task');

test('Basic Source', async (t) => {
    try {
        await task.flow('http://api.com', new task.Job(
            1,
            'https://raw.githubusercontent.com/openaddresses/openaddresses/a807875e0cbf6fdadc2ae06428f93462f860ad06/sources/us/tn/city_of_nashville.json',
            'addresses',
            'city-of-nashville'
        ));
    } catch(err) {
        t.error(err);
    }

    t.end();
});
