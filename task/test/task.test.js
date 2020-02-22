const test = require('tape');
const task = require('../task');

test('Basic Source', (t) => {
    task.flow(new task.Job(
        'https://raw.githubusercontent.com/openaddresses/openaddresses/39e3218cee02100ce614e10812bdd74afa509dc4/sources/us/dc/statewide.json',
        'addresses',
        'dcgis'
    ), (err) => {
        t.error(err); 

        t.end();
    });
});
