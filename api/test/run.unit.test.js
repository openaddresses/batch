const Run = require('../lib/run');
const test = require('tape');
const Flight = require('./flight');

const flight = new Flight();
flight.init(test);
flight.takeoff(test);

test('Run#generate', async (t) => {
    try {
        const run = await Run.generate(flight.config.pool, {
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
        const run = await Run.generate(flight.config.pool, {
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

    t.end();
});

test('Run#populate', async (t) => {
    try {
        const pop = await Run.populate(flight.config.pool, 1, [{
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
        const pop = await Run.populate(flight.config.pool, 2, [{
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
    t.equals(e.safe, 'Run is already closed');

    t.end();
});

test('Run#list', async (t) => {
    try {
        const runs = await Run.list(flight.config.pool);

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
        const runs = await Run.list(flight.config.pool, {
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
        const runs = await Run.list(flight.config.pool, {
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
        const runs = await Run.list(flight.config.pool, {
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

    t.end();
});

test('Run#jobs', async (t) => {
    try {
        const jobs = await Run.jobs(flight.config.pool, 1);

        t.equals(jobs.length, 1, 'jobs.length: 1');
        t.ok(jobs[0].created, 'jobs[0].created: <date>');
        delete jobs[0].created;
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

flight.landing(test);
