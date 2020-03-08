const Job = require('../lib/job');
const test = require('tape');

test('Job#processdir', (t) => {
    const tmp = Job.processdir('/tmp', [
        'source',
        'test.json',
        'process_one-jkbl8y07',
        'index.test'
    ]);

    t.equals(tmp, '/tmp/process_one-jkbl8y07');
    t.end();
});
