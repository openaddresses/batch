import Run from '../lib/types/run.js';
import test from 'node:test';
import assert from 'assert';
import Flight from './flight.js';

const flight = new Flight();
flight.init();
flight.takeoff();

test('Run#generate', async () => {
    try {
        const run = await Run.generate(flight.config.pool, {
            live: true,
            github: {}
        });

        assert.equal(run.id, 1, 'run.id: 1');
        assert.ok(run.created, 'run.created: <truthy>');
        assert.deepEqual(run.github, {}, 'run.github: {}');
        assert.equal(run.closed, false, 'run.closed: false');
    } catch (err) {
        assert.ifError(err, 'no error');
    }

    try {
        const run = await Run.generate(flight.config.pool, {
            live: false,
            github: {}
        });

        assert.equal(run.id, 2, 'run.id: 1');
        assert.ok(run.created, 'run.created: <truthy>');
        assert.deepEqual(run.github, {}, 'run.github: {}');
        assert.equal(run.closed, false, 'run.closed: false');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('Run#populate', async () => {
    try {
        const pop = await Run.populate(flight.config.pool, 1, [{
            source: 'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json',
            layer: 'addresses',
            name: 'city'
        }]);

        assert.deepEqual(pop, {
            run: 1,
            jobs: [1]
        }, 'Run 1 populated');
    } catch (err) {
        assert.ifError(err, 'no error');
    }

    try {
        const pop = await Run.populate(flight.config.pool, 2, [{
            source: 'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json',
            layer: 'addresses',
            name: 'city'
        }]);

        assert.deepEqual(pop, {
            run: 2,
            jobs: [2]
        }, 'Run 2 populated');
    } catch (err) {
        assert.ifError(err, 'no error');
    }

    let e;
    try {
        await Run.populate(flight.config.pool, 2, [{
            source: 'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json',
            layer: 'addresses',
            name: 'city'
        }]);
    } catch (err) {
        e = err;
    }
    assert.equal(e.safe, 'Run is already closed');
});

test('Run#list', async () => {
    try {
        const list = await Run.list(flight.config.pool, {
            order: 'desc'
        });

        assert.equal(list.total, 2, 'Runs.total: 2');
        assert.equal(list.runs.length, 2, 'Runs.length: 2');

        assert.equal(list.runs[0].id, 2, 'run[0].id: 2');
        assert.equal(list.runs[1].id, 1, 'run[1].id: 1');

        assert.ok(list.runs[0].created, 'run[0].created: <truthy>');
        assert.ok(list.runs[1].created, 'run[1].created: <truthy>');

        assert.deepEqual(list.runs[0].github, {}, 'run[0].github: {}');
        assert.deepEqual(list.runs[1].github, {}, 'run[1].github: {}');

        assert.equal(list.runs[0].closed, true, 'run[0].closed: false');
        assert.equal(list.runs[1].closed, true, 'run[1].closed: false');
    } catch (err) {
        assert.ifError(err, 'no error');
    }

    try {
        const list = await Run.list(flight.config.pool, {
            order: 'desc',
            limit: 1
        });

        assert.equal(list.runs.length, 1, 'Runs.length: 1');

        assert.equal(list.runs[0].id, 2, 'run[0].id: 2');
        assert.ok(list.runs[0].created, 'run[0].created: <truthy>');
        assert.deepEqual(list.runs[0].github, {}, 'run[0].github: {}');
        assert.equal(list.runs[0].closed, true, 'run[0].closed: false');
    } catch (err) {
        assert.ifError(err, 'no error');
    }

    try {
        const list = await Run.list(flight.config.pool, {
            order: 'desc',
            run: 1
        });

        assert.equal(list.runs.length, 1, 'Runs.length: 1');

        assert.equal(list.runs[0].id, 1, 'run[0].id: 1');
        assert.ok(list.runs[0].created, 'run[0].created: <truthy>');
        assert.deepEqual(list.runs[0].github, {}, 'run[0].github: {}');
        assert.equal(list.runs[0].closed, true, 'run[0].closed: false');
    } catch (err) {
        assert.ifError(err, 'no error');
    }

    try {
        const list = await Run.list(flight.config.pool, {
            run: 1,
            limit: 1
        });

        assert.equal(list.runs.length, 1, 'Runs.length: 1');

        assert.equal(list.runs[0].id, 1, 'run[0].id: 1');
        assert.ok(list.runs[0].created, 'run[0].created: <truthy>');
        assert.deepEqual(list.runs[0].github, {}, 'run[0].github: {}');
        assert.equal(list.runs[0].closed, true, 'run[0].closed: false');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('Run#jobs', async () => {
    try {
        const jobs = await Run.jobs(flight.config.pool, 1);

        assert.equal(jobs.length, 1, 'jobs.length: 1');
        assert.ok(jobs[0].created, 'jobs[0].created: <date>');
        delete jobs[0].created;
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

flight.landing();
