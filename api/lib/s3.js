import readline from 'readline';
import zlib from 'zlib';
import S3 from '@aws-sdk/client-s3';

const s3 = new S3.S3Client({ region: process.env.AWS_DEFAULT_REGION });

/**
 * @class
 */
export default class S3 {
    constructor(params) {
        this.params = params;
    }

    async stream(res, name) {
        const s3headers = await s3.send(new S3.HeadObjectCommand(this.params));
        const s3request = await s3.send(new S3.GetObjectCommand(this.params));

        s3request.on('httpHeaders', (statusCode, headers) => {
            headers['Content-disposition'] = `inline; filename="${name}"`;

        });

        res.writeHead(statusCode, {
            'Content-Disposition': `inline; filename="${name}"`,
            'Content-Length': s3headers.ContentLength,
            'ContentType': s3headers.ContentType,
        });

        s3request.Body.pipe(res);
    }

    async sample() {
        return new Promise((resolve, reject) => {
            const buffer = [];
            const req = await s3.send(new S3.GetObjectCommand(this.params));

            const zlibstream = zlib.createGunzip();
            zlibstream.on('error', error);

            const input = s3stream.Body.pipe(zlibstream);

            new readline.createInterface({
                input: input
            }).on('line', (line) => {
                if (buffer.length <= 20) {
                    buffer.push(JSON.parse(line));

                    if (buffer.length === 20) {
                        req.abort();
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
