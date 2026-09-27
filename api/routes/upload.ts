import Err from '@openaddresses/batch-error';
import busboy from 'busboy';
import type { Readable } from 'node:stream';
import Upload from '../lib/upload.js';
import Auth from '../lib/auth.js';
import Schema from '@openaddresses/batch-schema';
import type { AuthObject } from '../lib/auth.js';
import {
    StandardResponse,
} from '../lib/types.js';

export default async function router(schema: Schema) {
    await schema.post('/upload', {
        name: 'Create Upload',
        group: 'Upload',
        description: `
            Statically cache source data

            If a source is unable to be pulled from directly, authenticated users can cache
            data resources to the OpenAddresses S3 cache to be pulled from
        `,
        res: StandardResponse,
    }, async (req, res) => {
        let auth: AuthObject;
        try {
            auth = await Auth.is_flag(req, 'upload');
        } catch (err) {
            return Err.respond(err, res);
        }

        if (req.headers['content-type']) {
            req.headers['content-type'] = req.headers['content-type'].split(',')[0];
        }

        let bb;
        try {
            bb = busboy({
                headers: req.headers,
            });
        } catch (err) {
            return Err.respond(err, res);
        }

        const files: Array<Promise<{ url: string }>> = [];

        bb.on('file', (fieldname: string, file: Readable, blob: { filename: string }) => {
            files.push(Upload.put(auth.uid, blob.filename, file));
        }).on('error', (err: Error) => {
            Err.respond(err, res);
        }).on('close', async () => {
            try {
                await Promise.all(files);

                return res.json({
                    status: 200,
                    message: 'Upload Success',
                });
            } catch (err) {
                Err.respond(err, res);
            }
        });

        return req.pipe(bb);
    });
}
