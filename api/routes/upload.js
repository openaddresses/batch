import Err from '@openaddresses/batch-error';
import busboy from 'busboy';
import Upload from '../lib/upload.js';
import Auth from '../lib/auth.js';

export default async function router(schema) {
    await schema.post('/upload', {
        name: 'Create Upload',
        group: 'Upload',
        auth: 'upload',
        description: `
            Statically cache source data

            If a source is unable to be pulled from directly, authenticated users can cache
            data resources to the OpenAddresses S3 cache to be pulled from
        `,
        res: 'res.Standard.json'
    }, async (req, res) => {
        try {
            await Auth.is_flag(req, 'upload');
        } catch (err) {
            return Err.respond(err, res);
        }

        if (req.headers['content-type']) {
            req.headers['content-type'] = req.headers['content-type'].split(',')[0];
        }

        let bb;
        try {
            bb = busboy({
                headers: req.headers
            });
        } catch (err) {
            return Err.respond(err, res);
        }

        const files = [];

        bb.on('file', (fieldname, file, blob) => {
            files.push(Upload.put(req.auth.uid, blob.filename, file));
        }).on('error', (err) => {
            Err.respond(res, err);
        }).on('close', async () => {
            try {
                await Promise.all(files);

                return res.json({
                    status: 200,
                    message: 'Upload Success'
                });
            } catch (err) {
                Err.respond(res, err);
            }
        });

        return req.pipe(bb);
    });
}
