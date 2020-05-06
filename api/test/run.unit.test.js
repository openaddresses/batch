'use strict';

const Run = require('../lib/run');
const test = require('tape');
const {init} = require('./init');
const { Pool } = require('pg');

init(test);

test('Run()', (t) => {
    const run = new Run();

    t.equals(run.id, false, 'run.id: false');
    t.equals(run.created, false, 'run.created: false');
    t.deepEquals(run.github, {}, 'run.github: {}');
    t.equals(run.closed, false, 'run.closed: false');

    t.end();
});

test('Run#generate', async (t) => {
    const pool = new Pool({
        connectionString: 'postgres://postgres@localhost:5432/openaddresses_test'
    });

    try {
        const run = await Run.generate(pool, {
            live: true,
            github: {}
        });

        t.equals(run.id, 1, 'run.id: 1');
        t.ok(run.created, 'run.created: <truthy>');
        t.deepEquals(run.github, {}, 'run.github: {}');
        t.equals(run.closed, false, 'run.closed: false');
    } catch (err) {
        t.error(err, 'no error');
    }

    try {
        const run = await Run.generate(pool, {
            live: false,
            github: {}
        });

        t.equals(run.id, 2, 'run.id: 1');
        t.ok(run.created, 'run.created: <truthy>');
        t.deepEquals(run.github, {}, 'run.github: {}');
        t.equals(run.closed, false, 'run.closed: false');
    } catch (err) {
        t.error(err, 'no error');
    }

    pool.end();
    t.end();
});

test('Run#populate', async (t) => {
    const pool = new Pool({
        connectionString: 'postgres://postgres@localhost:5432/openaddresses_test'
    });

    try {
        const pop = await Run.populate(pool, 1, [{
            source: 'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json',
            layer: 'addresses',
            name: 'city'
        }]);

        t.deepEquals(pop, {
            run: 1,
            jobs: [1]
        }, 'Run 1 populated');
    } catch (err) {
        t.error(err, 'no error');
    }

    try {
        const pop = await Run.populate(pool, 2, [{
            source: 'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json',
            layer: 'addresses',
            name: 'city'
        }]);

        t.deepEquals(pop, {
            run: 2,
            jobs: [2]
        }, 'Run 2 populated');
    } catch (err) {
        t.error(err, 'no error');
    }

    Run.populate(pool, 2, [{
        source: 'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json',
        layer: 'addresses',
        name: 'city'
    }]).catch((err) => {
        t.equals(err.safe, 'Run is already closed');

        pool.end();
        t.end();
    });
});

test('Run#list', async (t) => {
    const pool = new Pool({
        connectionString: 'postgres://postgres@localhost:5432/openaddresses_test'
    });

    try {
        const runs = await Run.list(pool);

        t.equals(runs.length, 2, 'Runs.length: 2');

        t.equals(runs[0].id, 2, 'run[0].id: 2');
        t.equals(runs[1].id, 1, 'run[1].id: 1');

        t.ok(runs[0].created, 'run[0].created: <truthy>');
        t.ok(runs[1].created, 'run[1].created: <truthy>');

        t.deepEquals(runs[0].github, {}, 'run[0].github: {}');
        t.deepEquals(runs[1].github, {}, 'run[1].github: {}');

        t.equals(runs[0].closed, true, 'run[0].closed: false');
        t.equals(runs[1].closed, true, 'run[1].closed: false');
    } catch (err) {
        t.error(err, 'no error');
    }

    try {
        const runs = await Run.list(pool, {
            limit: 1
        });

        t.equals(runs.length, 1, 'Runs.length: 1');

        t.equals(runs[0].id, 2, 'run[0].id: 2');
        t.ok(runs[0].created, 'run[0].created: <truthy>');
        t.deepEquals(runs[0].github, {}, 'run[0].github: {}');
        t.equals(runs[0].closed, true, 'run[0].closed: false');
    } catch (err) {
        t.error(err, 'no error');
    }

    try {
        const runs = await Run.list(pool, {
            run: 1
        });

        t.equals(runs.length, 1, 'Runs.length: 1');

        t.equals(runs[0].id, 1, 'run[0].id: 1');
        t.ok(runs[0].created, 'run[0].created: <truthy>');
        t.deepEquals(runs[0].github, {}, 'run[0].github: {}');
        t.equals(runs[0].closed, true, 'run[0].closed: false');
    } catch (err) {
        t.error(err, 'no error');
    }

    try {
        const runs = await Run.list(pool, {
            run: 1,
            limit: 1
        });

        t.equals(runs.length, 1, 'Runs.length: 1');

        t.equals(runs[0].id, 1, 'run[0].id: 1');
        t.ok(runs[0].created, 'run[0].created: <truthy>');
        t.deepEquals(runs[0].github, {}, 'run[0].github: {}');
        t.equals(runs[0].closed, true, 'run[0].closed: false');
    } catch (err) {
        t.error(err, 'no error');
    }

    pool.end();
    t.end();
});
