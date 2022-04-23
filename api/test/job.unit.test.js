import Job from '../lib/job.js';
import fs from 'fs';
import test from 'node:test';
import assert from 'assert';
import nock from 'nock';
import Flight from './flight.js';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));

const flight = new Flight();
flight.init();
flight.takeoff();

test('Job()', () => {
    assert.throws(() => {
        new Job();
    }, /Job.run must be numeric/, 'Job.run must be numeric');

    assert.throws(() => {
        new Job(1);
    }, /Job.source must be a string/, 'Job.source must be a string');

    assert.throws(() => {
        new Job(
            1,
            'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json'
        );
    }, /Job.layer must be a string/, 'Job.layer must be a string');

    assert.throws(() => {
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

    assert.equal(job.id, false, 'job.id: false');
    assert.equal(job.run, 1, 'job.run: 1');
    assert.equal(job.map, null, 'job.map: null');
    assert.equal(job.created, false, 'job.created: false');
    assert.equal(job.source, 'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json', 'job.source: <url>');
    assert.equal(job.layer, 'addresses', 'job.layer: addresses');
    assert.equal(job.count, 0, 'job.count: 0');
    assert.equal(job.bounds, false, 'job.bounds: false');
    assert.deepEqual(job.stats, {}, 'job.stats: {}');
    assert.equal(job.name, 'city', 'job.name: city');
    assert.equal(job.license, false, 'job.license: null');
    assert.equal(job.size, 0, 'job.size: 0');
    assert.deepEqual(job.output, {
        cache: false,
        output: false,
        preview: false,
        validated: false
    }, 'job.output: <obj>');
    assert.equal(job.loglink, false, 'job.loglink: false');
    assert.equal(job.status, 'Pending', 'job.status: Pending');
    assert.equal(job.version, JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url))).version, 'job.version: <version>');
    assert.deepEqual(job.stats, {}, 'job.stats: {}');
    assert.equal(job.raw, false, 'job.raw: false');
});

test('Job#get_raw', async () => {
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

    try {
        const raw = await job.get_raw();
        assert.deepEqual(raw, {
            schema: 2
        }, 'job.raw: { <job> }');
    } catch (err) {
        assert.ifError(err, 'no error');
    }

    try {
        const raw = await job.get_raw();

        assert.deepEqual(raw, {
            schema: 2
        }, 'job.raw: { <job> }');
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('Job#fullname', () => {
    const job = new Job(
        1,
        'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json',
        'addresses',
        'city'
    );

    assert.equal(job.fullname(), 'us/pa/bucks', 'Job.fullname(): us/pa/bucks');
});

test('Job#json', () => {
    const job = new Job(
        1,
        'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json',
        'addresses',
        'city'
    );

    assert.deepEqual(job.json(), {
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
});

test('Job#generate', async () => {
    try {
        const job = new Job(
            1,
            'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json',
            'addresses',
            'city'
        );

        job.run = null;
        await job.generate(flight.config.pool);

        assert.fail('job.generate should fail');
    } catch (err) {
        assert.deepEqual(err, {
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

        assert.fail('job.generate should fail');
    } catch (err) {
        assert.deepEqual(err, {
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

        assert.fail('job.generate should fail');
    } catch (err) {
        assert.deepEqual(err, {
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

        assert.fail('job.generate should fail');
    } catch (err) {
        assert.deepEqual(err, {
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

        assert.equal(job.id, 1, 'job.id: 1');
        assert.equal(job.run, 1, 'job.run: 1');
        assert.equal(job.map, null, 'job.map: null');
        assert.ok(job.created, 'job.created: <date>');
        assert.equal(job.source, 'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json', 'job.source: <url>');
        assert.equal(job.layer, 'addresses', 'job.layer: addresses');
        assert.equal(job.count, null, 'job.count: null');
        assert.equal(job.bounds, null, 'job.bounds: null');
        assert.deepEqual(job.stats, {}, 'job.stats: {}');
        assert.equal(job.name, 'city', 'job.name: city');
        assert.deepEqual(job.output, {
            cache: false,
            output: false,
            preview: false,
            validated: false
        }, 'job.output: false');
        assert.equal(job.loglink, null, 'job.loglink: <obj>');
        assert.equal(job.status, 'Pending', 'job.status: Pending');
        assert.equal(job.version, JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url))).version, 'job.version: <version>');
        assert.deepEqual(job.stats, {}, 'job.stats: {}');
        assert.equal(job.raw, false, 'job.raw: false');

    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('Job#from', async () => {
    try {
        await Job.from(flight.config.pool, 2);
        assert.fail('Job#from should fail');
    } catch (err) {
        assert.deepEqual(err, {
            status: 404,
            err: null,
            safe: 'no job by that id'
        });
    }

    try {
        const job = await Job.from(flight.config.pool, 1);

        assert.equal(job.id, 1, 'job.id: 1');
        assert.equal(job.run, 1, 'job.run: 1');
        assert.equal(job.map, null, 'job.map: null');
        assert.ok(job.created, 'job.created: <date>');
        assert.equal(job.source, 'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json', 'job.source: <url>');
        assert.equal(job.layer, 'addresses', 'job.layer: addresses');
        assert.equal(job.count, null, 'job.count: null');
        assert.equal(job.bounds, null, 'job.bounds: null');
        assert.deepEqual(job.stats, {}, 'job.stats: {}');
        assert.equal(job.name, 'city', 'job.name: city');
        assert.deepEqual(job.output, {
            cache: false,
            output: false,
            preview: false,
            validated: false
        }, 'job.output: false');
        assert.equal(job.loglink, null, 'job.loglink: <obj>');
        assert.equal(job.status, 'Pending', 'job.status: Pending');
        assert.equal(job.version, JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url))).version, 'job.version: <version>');
        assert.deepEqual(job.stats, {}, 'job.stats: {}');
        assert.equal(job.raw, false, 'job.raw: false');

    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('Job#patch', async () => {
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
        assert.ifError(err, 'no error');
    }

    try {
        const job = await Job.from(flight.config.pool, 1);

        assert.equal(job.id, 1, 'job.id: 1');
        assert.equal(job.run, 1, 'job.run: 1');
        assert.equal(job.map, null, 'job.map: null');
        assert.ok(job.created, 'job.created: <date>');
        assert.equal(job.source, 'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json', 'job.source: <url>');
        assert.equal(job.layer, 'addresses', 'job.layer: addresses');
        assert.equal(job.count, 123, 'job.count: null');
        assert.equal(job.bounds, null, 'job.bounds: null');
        assert.deepEqual(job.stats, {}, 'job.stats: {}');
        assert.equal(job.name, 'city', 'job.name: city');
        assert.deepEqual(job.output, {
            cache: false,
            output: false,
            preview: false,
            validated: false
        }, 'job.output: false');
        assert.equal(job.loglink, 'loglink123', 'job.loglink: <obj>');
        assert.equal(job.status, 'Pending', 'job.status: Pending');
        assert.equal(job.version, '0.0.1', 'job.version: <version>');
        assert.deepEqual(job.stats, {}, 'job.stats: {}');
        assert.equal(job.raw, false, 'job.raw: false');

    } catch (err) {
        assert.ifError(err, 'no error');
    }
});

test('close', () => {
    nock.cleanAll();
    nock.enableNetConnect();
});

flight.landing();
