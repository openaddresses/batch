const test = require('tape');
const Job = require('../lib/job');

test('Count: 10% Reduction', async (t) => {
    const job = new Job(true, 1);
    job.layer = 'addresses';

    let job_update = false;
    job.update = async (body) => {
        job_update = body;
    };

    let job_err = false;
    job.oa = {
        cmd: async (cmd, subcmd, body) => {
            job_err = body;
        }
    };

    await job.check_stats({live : true}, {
        delta: { count: 90 },
        master: { count: 100 }
    });

    t.deepEquals(job_update, {
        status: 'Warn'
    }, 'job.status: Warn');
    t.deepEquals(job_err, {
        job: 1,
        message: 'Feature count dropped by 10'
    }, 'joberror: Feature count dropped by 10');
    t.end();
});

test('Count: 9% Reduction', async (t) => {
    const job = new Job(true, 1);
    job.layer = 'addresses';

    let job_update = false;
    job.update = async (body) => {
        job_update = body;
    };

    let job_err = false;
    job.oa = {
        cmd: async (cmd, subcmd, body) => {
            job_err = body;
        }
    };

    await job.check_stats({live : true}, {
        delta: { count: 91 },
        master: { count: 100 }
    });

    t.deepEquals(job_update, false);
    t.deepEquals(job_err, false);
    t.end();
});
