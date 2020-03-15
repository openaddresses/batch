const test = require('tape');
const task = require('../task');

test('Basic Source', async (t) => {
    try {
        await task.flow('http://api.com', new task.Job(
            1,
            'https://raw.githubusercontent.com/openaddresses/openaddresses/39e3218cee02100ce614e10812bdd74afa509dc4/sources/us/dc/statewide.json',
            'addresses',
            'dcgis'
        ));
    } catch(err) {
        t.error(err);
    }

    t.end();
});
