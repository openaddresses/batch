import fs from 'fs';
import test from 'node:test';
import assert from 'assert';
import Flight from './flight.js';

const flight = new Flight();

flight.init();
flight.takeoff();

test('POST: api/upload', async () => {
    try {
        const form = new FormData();
        form.append('file', await fs.createReadStream(new URL('./upload.srv.test.js', import.meta.url)));

        const res = await flight.fetch('/api/upload', {
            method: 'POST',
            headers: {
                'shared-secret': '123',
                'content-type': 'multipart/form-data'
            },
            body: form
        }, false);

        assert.deepEqual(res.body, {

        });
    } catch (err) {
        console.error(err);
        assert.ifError(err, 'no error');
    }
});


flight.landing();
