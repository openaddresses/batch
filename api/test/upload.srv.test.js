import fs from 'fs';
import fsp from 'fs/promises';
import test from 'node:test';
import assert from 'assert';
import Flight from './flight.js';
import AWS from '@mapbox/mock-aws-sdk-js';
import { pipeline } from 'stream/promises';

const flight = new Flight();

flight.init();
flight.takeoff();

test('POST: api/upload', async () => {
    try {
        AWS.stub('S3', 'upload', async function(params) {
            assert.equal(params.Bucket, 'v2.openaddresses.io');
            assert.equal(params.ACL, 'public-read');
            assert.equal(!!params.Key.includes('test/upload/'), true);

            await pipeline(
                params.Body,
                fs.createWriteStream('/dev/null')
            );

            return this.request.promise.returns(Promise.resolve({}));
        });

        const form = new FormData();
        form.append('file', new Blob(await fsp.readFile(new URL('./upload.srv.test.js', import.meta.url))));

        const res = await flight.fetch('/api/upload', {
            method: 'POST',
            headers: {
                'shared-secret': '123',
            },
            body: form
        }, false);

        AWS.S3.restore();
    } catch (err) {
        assert.ifError(err, 'no error');
    }
});


flight.landing();
