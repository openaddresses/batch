'use strict';

const Job = require('../lib/job');
const pkg = require('../package.json');
const test = require('tape');
const nock = require('nock');

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
    t.deepEquals(job.stats, {}, 'job.stats: {}');
    t.equals(job.name, 'city', 'job.name: city');
    t.equals(job.output, false, 'job.output: false');
    t.equals(job.loglink, false, 'job.loglink: false');
    t.equals(job.status, 'Pending', 'job.status: Pending');
    t.equals(job.version, require('../package.json').version, 'job.version: <version>');
    t.deepEquals(job.stats, {}, 'job.stats: {}');
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
            q.deepEquals(raw, {
                schema: 2
            }, 'job.raw: { <job> }');

            q.end();
        }).catch((err) => {
            q.error(err, 'no error');
        });
    });

    t.test('Job.get_raw - 2nd call', (q) => {
        job.get_raw().then((raw) =>{
            q.deepEquals(raw, {
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

    t.deepEquals(job.json(), {
        id: NaN,
        run: 1,
        map: null,
        created: false,
        source_name: 'us/pa/bucks',
        source: 'https://raw.githubusercontent.com/openaddresses/openaddresses/48ad45b0c73205457c1bfe4ff6ed7a45011d25a8/sources/us/pa/bucks.json',
        layer: 'addresses',
        name: 'city',
        output: false,
        loglink: false,
        status: 'Pending',
        version: pkg.version,
        bounds: false,
        count: 0,
        stats: {}
    });
    t.end();
});

test('Job#from', (t) => {
    t.end();
});

test('Job#patch', (t) => {
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

test('Job#generate', (t) => {
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
