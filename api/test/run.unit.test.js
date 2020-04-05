'use strict';

const Run = require('../lib/run');
const test = require('tape');

test('Run()', (t) => {
    const run = new Run();

    t.equals(run.id, false, 'run.id: false');
    t.equals(run.created, false, 'run.created: false');
    t.deepEquals(run.github, {}, 'run.github: {}');
    t.equals(run.closed, false, 'run.closed: false');

    t.end();
});
