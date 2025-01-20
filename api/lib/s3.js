import Err from '@openaddresses/batch-error';
import readline from 'readline';
import zlib from 'zlib';
import S3 from '@aws-sdk/client-s3';

const s3 = new S3.S3Client({ region: process.env.AWS_DEFAULT_REGION });

/**
 * @class
 */
export default class S3Helper {
    constructor(params) {
        this.params = params;
    }

    async stream(res, name) {
        let s3headers;
        try {
            s3headers = await s3.send(new S3.HeadObjectCommand(this.params));
        } catch (err) {
            if (err.Code === 'NoSuchKey') throw new Err(404, null, 'No File Found');
            throw new Err(500, err, 'Internal Error');
        }

        const s3request = await s3.send(new S3.GetObjectCommand(this.params));

        res.writeHead(200, {
            'Content-Disposition': `inline; filename="${name}"`,
            'Content-Length': s3headers.ContentLength,
            'Content-Type': s3headers.ContentType
        });

        s3request.Body.pipe(res);
    }

    async sample() {
        const buffer = [];
        const req = await s3.send(new S3.GetObjectCommand(this.params));

        return new Promise((resolve, reject) => {
            const zlibstream = zlib.createGunzip();
            zlibstream.on('error', error);

            const input = req.Body.pipe(zlibstream);

            new readline.createInterface({
                input: input
            }).on('line', (line) => {
                if (buffer.length <= 20) {
                    buffer.push(JSON.parse(line));

                    if (buffer.length === 20) {
                        return resolve(buffer);
                    }
                }
            }).on('error', error);

            function error(err) {
                // Zlib will often complain the stream is cut short
                // If we've already returned the 20 required lines, ignore eit
                if (buffer.length < 20) {
                    return resolve(buffer);
                } else {
                    return reject(new Error(err));
                }
            }
        });
    }
}
