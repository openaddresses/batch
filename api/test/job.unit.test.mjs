import Job from '../lib/job.js';
import fs from 'fs';
import test from 'tape';
import nock from 'nock';
import Flight from './flight.mjs';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));

const flight = new Flight();
flight.init(test);
flight.takeoff(test);

test('Job()', (t) => {
    t.throws(() => {
        new Job();
    }, /Job.run must be numeric/, 'Job.run must be numeric');

    t.throws(() => {
        new Job(1);
    }, /Job.source must be a string/, 'Job.source must be a string');

    t.throws(() => {
        new Job(
            1,
            'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json'
        );
    }, /Job.layer must be a string/, 'Job.layer must be a string');

    t.throws(() => {
        new Job(
            1,
            'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json',
            'addresses'
        );
    }, /Job.name must be a string/, 'Job.name must be a string');

    const job = new Job(
        1,
        'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json',
        'addresses',
        'city'
    );

    t.equals(job.id, false, 'job.id: false');
    t.equals(job.run, 1, 'job.run: 1');
    t.equals(job.map, null, 'job.map: null');
    t.equals(job.created, false, 'job.created: false');
    t.equals(job.source, 'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json', 'job.source: <url>');
    t.equals(job.layer, 'addresses', 'job.layer: addresses');
    t.equals(job.count, 0, 'job.count: 0');
    t.equals(job.bounds, false, 'job.bounds: false');
    t.deepLooseEqual(job.stats, {}, 'job.stats: {}');
    t.equals(job.name, 'city', 'job.name: city');
    t.equals(job.license, false, 'job.license: null');
    t.equals(job.size, 0, 'job.size: 0');
    t.deepLooseEqual(job.output, {
        cache: false,
        output: false,
        preview: false,
        validated: false
    }, 'job.output: <obj>');
    t.equals(job.loglink, false, 'job.loglink: false');
    t.equals(job.status, 'Pending', 'job.status: Pending');
    t.equals(job.version, JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url))).version, 'job.version: <version>');
    t.deepLooseEqual(job.stats, {}, 'job.stats: {}');
    t.equals(job.raw, false, 'job.raw: false');

    t.end();
});

test('Job#get_raw', (t) => {
    nock('https://raw.githubusercontent.com')
        .get('/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json')
        .reply(200, {
            schema: 2
        });

    const job = new Job(
        1,
        'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json',
        'addresses',
        'city'
    );

    t.test('Job.get_raw - 1st call', (q) => {
        job.get_raw().then((raw) =>{
            q.deepLooseEqual(raw, {
                schema: 2
            }, 'job.raw: { <job> }');

            q.end();
        }).catch((err) => {
            q.error(err, 'no error');
        });
    });

    t.test('Job.get_raw - 2nd call', (q) => {
        job.get_raw().then((raw) =>{
            q.deepLooseEqual(raw, {
                schema: 2
            }, 'job.raw: { <job> }');

            q.end();
        }).catch((err) => {
            t.error(err, 'no error');
        });
    });

    t.end();
});

test('Job#fullname', (t) => {
    const job = new Job(
        1,
        'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json',
        'addresses',
        'city'
    );

    t.equals(job.fullname(), 'us/pa/bucks', 'Job.fullname(): us/pa/bucks');
    t.end();
});

test('Job#json', (t) => {
    const job = new Job(
        1,
        'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json',
        'addresses',
        'city'
    );

    t.deepLooseEqual(job.json(), {
        id: false,
        s3: false,
        run: 1,
        map: null,
        size: 0,
        created: false,
        source_name: 'us/pa/bucks',
        source: 'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json',
        layer: 'addresses',
        name: 'city',
        output: {
            cache: false,
            output: false,
            preview: false,
            validated: false
        },
        loglink: false,
        license: false,
        status: 'Pending',
        version: pkg.version,
        count: 0,
        bounds: false,
        stats: {}
    });
    t.end();
});

test('Job#generate', async (t) => {
    try {
        const job = new Job(
            1,
            'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json',
            'addresses',
            'city'
        );

        job.run = null;
        await job.generate(flight.config.pool);

        t.fail('job.generate should fail');
    } catch (err) {
        t.deepLooseEqual(err, {
            status: 400,
            err: null,
            safe: 'Cannot generate a job without a run'
        }, 'Cannot generate a job without a run');
    }

    try {
        const job = new Job(
            1,
            'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json',
            'addresses',
            'city'
        );

        job.source = null;
        await job.generate(flight.config.pool);

        t.fail('job.generate should fail');
    } catch (err) {
        t.deepLooseEqual(err, {
            status: 400,
            err: null,
            safe: 'Cannot generate a job without a source'
        }, 'Cannot generate a job without a source');
    }

    try {
        const job = new Job(
            1,
            'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json',
            'addresses',
            'city'
        );

        job.layer = null;
        await job.generate(flight.config.pool);

        t.fail('job.generate should fail');
    } catch (err) {
        t.deepLooseEqual(err, {
            status: 400,
            err: null,
            safe: 'Cannot generate a job without a layer'
        }, 'Cannot generate a job without a layer');
    }

    try {
        const job = new Job(
            1,
            'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json',
            'addresses',
            'city'
        );

        job.name = null;
        await job.generate(flight.config.pool);

        t.fail('job.generate should fail');
    } catch (err) {
        t.deepLooseEqual(err, {
            status: 400,
            err: null,
            safe: 'Cannot generate a job without a name'
        }, 'Cannot generate a job without a name');
    }

    try {
        const job = new Job(
            1,
            'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json',
            'addresses',
            'city'
        );

        await job.generate(flight.config.pool);

        t.equals(job.id, 1, 'job.id: 1');
        t.equals(job.run, 1, 'job.run: 1');
        t.equals(job.map, null, 'job.map: null');
        t.ok(job.created, 'job.created: <date>');
        t.equals(job.source, 'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json', 'job.source: <url>');
        t.equals(job.layer, 'addresses', 'job.layer: addresses');
        t.equals(job.count, null, 'job.count: null');
        t.equals(job.bounds, null, 'job.bounds: null');
        t.deepLooseEqual(job.stats, {}, 'job.stats: {}');
        t.equals(job.name, 'city', 'job.name: city');
        t.deepLooseEqual(job.output, {
            cache: false,
            output: false,
            preview: false,
            validated: false
        }, 'job.output: false');
        t.equals(job.loglink, null, 'job.loglink: <obj>');
        t.equals(job.status, 'Pending', 'job.status: Pending');
        t.equals(job.version, JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url))).version, 'job.version: <version>');
        t.deepLooseEqual(job.stats, {}, 'job.stats: {}');
        t.equals(job.raw, false, 'job.raw: false');

    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('Job#from', async (t) => {
    try {
        await Job.from(flight.config.pool, 2);
        t.fail('Job#from should fail');
    } catch (err) {
        t.deepLooseEqual(err, {
            status: 404,
            err: null,
            safe: 'no job by that id'
        });
    }

    try {
        const job = await Job.from(flight.config.pool, 1);

        t.equals(job.id, 1, 'job.id: 1');
        t.equals(job.run, 1, 'job.run: 1');
        t.equals(job.map, null, 'job.map: null');
        t.ok(job.created, 'job.created: <date>');
        t.equals(job.source, 'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json', 'job.source: <url>');
        t.equals(job.layer, 'addresses', 'job.layer: addresses');
        t.equals(job.count, null, 'job.count: null');
        t.equals(job.bounds, null, 'job.bounds: null');
        t.deepLooseEqual(job.stats, {}, 'job.stats: {}');
        t.equals(job.name, 'city', 'job.name: city');
        t.deepLooseEqual(job.output, {
            cache: false,
            output: false,
            preview: false,
            validated: false
        }, 'job.output: false');
        t.equals(job.loglink, null, 'job.loglink: <obj>');
        t.equals(job.status, 'Pending', 'job.status: Pending');
        t.equals(job.version, require('../package.json').version, 'job.version: <version>');
        t.deepLooseEqual(job.stats, {}, 'job.stats: {}');
        t.equals(job.raw, false, 'job.raw: false');

    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('Job#patch', async (t) => {
    try {
        const job = await Job.from(flight.config.pool, 1);

        // These should not update
        job.id = 1;
        job.run = 2;

        job.loglink = 'loglink123';
        job.version = '0.0.1';
        job.count = 123;

        await job.commit(flight.config.pool);
    } catch (err) {
        t.error(err, 'no error');
    }

    try {
        const job = await Job.from(flight.config.pool, 1);

        t.equals(job.id, 1, 'job.id: 1');
        t.equals(job.run, 1, 'job.run: 1');
        t.equals(job.map, null, 'job.map: null');
        t.ok(job.created, 'job.created: <date>');
        t.equals(job.source, 'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json', 'job.source: <url>');
        t.equals(job.layer, 'addresses', 'job.layer: addresses');
        t.equals(job.count, 123, 'job.count: null');
        t.equals(job.bounds, null, 'job.bounds: null');
        t.deepLooseEqual(job.stats, {}, 'job.stats: {}');
        t.equals(job.name, 'city', 'job.name: city');
        t.deepLooseEqual(job.output, {
            cache: false,
            output: false,
            preview: false,
            validated: false
        }, 'job.output: false');
        t.equals(job.loglink, 'loglink123', 'job.loglink: <obj>');
        t.equals(job.status, 'Pending', 'job.status: Pending');
        t.equals(job.version, '0.0.1', 'job.version: <version>');
        t.deepLooseEqual(job.stats, {}, 'job.stats: {}');
        t.equals(job.raw, false, 'job.raw: false');

    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('Job#preview', (t) => {
    t.end();
});

test('Job#data', (t) => {
    t.end();
});

test('Job#cache', (t) => {
    t.end();
});

test('Job#commit', (t) => {
    t.end();
});

test('Job#log', (t) => {
    t.end();
});

test('Job#batch', (t) => {
    t.end();
});

test('close', (t) => {
    nock.cleanAll();
    nock.enableNetConnect();
    t.end();
});

flight.landing(test);
