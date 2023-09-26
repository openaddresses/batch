import fs from 'fs';
import path from 'path';
import Job from '../lib/job.js';
import test from 'tape';
import stream from 'stream';
import Sinon from 'sinon';
import S3 from '@aws-sdk/client-s3';

test('Job#compress', async (t) => {
    try {
        const job = new Job(true, 1);

        fs.writeFileSync(path.resolve(job.tmp, 'out.geojson'), 'test-string');

        t.ok(await job.compress());
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('Job#s3_down', async (t) => {
    try {
        const job = new Job(true, 1);

        job.source = 'http://example.com';
        job.layer = 'addresses';
        job.name = 'county';

        job.specific = JSON.parse(fs.readFileSync(new URL('./fixtures/us-or-clackamas.json', import.meta.url))).layers.addresses[0];

        Sinon.stub(S3.S3Client.prototype, 'send').callsFake((command) => {
            t.ok(command instanceof S3.GetObjectCommand);
            t.deepEquals(command.input, {
                Bucket: 'data.openaddresses.io',
                Key: 'cache/us-or-clackamas.zip'
            });

            return {
                Body: new stream.Readable({
                    read: function() {
                        this.push('123');
                        this.push(null);
                    }
                })
            };
        });

        await job.s3_down();

        t.equals(job.specific.protocol, 'file', 'protocol: file');
        t.ok(job.specific.data.match(/file:\/\//), 'data: <file://> prefix');
    } catch (err) {
        t.error(err);
    }

    Sinon.restore();

    t.end();
});
