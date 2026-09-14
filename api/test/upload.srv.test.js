import fsp from 'fs/promises';
import test from 'node:test';
import assert from 'assert';
import Flight from './flight.js';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const flight = new Flight();

flight.init();
flight.takeoff();

test('POST: api/upload', async () => {
    const s3 = mockClient(S3Client);

    try {
        s3.on(PutObjectCommand).callsFake((params) => {
            assert.equal(params.Bucket, 'v2.openaddresses.io');
            assert.equal(params.ACL, 'public-read');
            assert.equal(!!params.Key.includes('test/upload/'), true);
            assert.ok(params.Body.length > 0, 'upload body is not empty');

            return {};
        });

        const form = new FormData();
        form.append('file', new Blob(await fsp.readFile(new URL('./upload.srv.test.js', import.meta.url))));

        const res = await flight.fetch('/api/upload', {
            method: 'POST',
            headers: {
                'shared-secret': '123'
            },
            body: form
        }, false);

        assert.deepEqual(res.body, {
            message: 'Upload Success',
            status: 200
        });

        assert.equal(s3.commandCalls(PutObjectCommand).length, 1, 'one PutObject call');
    } catch (err) {
        assert.ifError(err, 'no error');
    } finally {
        s3.restore();
    }
});


flight.landing();
