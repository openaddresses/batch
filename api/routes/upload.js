import { Err } from '@openaddresses/batch-schema';
import busboy from 'busboy';
import Upload from '../lib/upload.js';
import Auth from '../lib/auth.js';

export default async function router(schema) {
    /**
     * @api {post} /api/upload Create Upload
     * @apiVersion 1.0.0
     * @apiName upload
     * @apiGroup Upload
     * @apiPermission upload
     *
     * @apiDescription
     *     Statically cache source data
     *
     *     If a source is unable to be pulled from directly, authenticated users can cache
     *     data resources to the OpenAddresses S3 cache to be pulled from
     *
     * @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
     */
    await schema.post('/upload', {
        res: 'res.Standard.json'
    }, async (req, res) => {
        try {
            await Auth.is_flag(req, 'upload');
        } catch (err) {
            return Err.respond(err, res);
        }

        const bb = busboy({
            headers: req.headers
        });
        console.error(bb);

        const files = [];

        bb.on('file', (fieldname, file, filename) => {
            files.push(Upload.put(req.auth.uid, filename, file));
        });

        bb.on('close', async () => {
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
