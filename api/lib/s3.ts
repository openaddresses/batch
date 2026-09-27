import Err from '@openaddresses/batch-error';
import readline from 'readline';
import zlib from 'zlib';
import { Readable } from 'node:stream';
import type { Response } from 'express';
import S3 from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3.S3Client({ region: process.env.AWS_DEFAULT_REGION });

/**
 * @class
 */
export default class S3Helper {
    params: S3.GetObjectCommandInput;

    constructor(params: S3.GetObjectCommandInput) {
        this.params = params;
    }

    async url(): Promise<string> {
        const command = new S3.GetObjectCommand(this.params);
        return await getSignedUrl(s3, command, { expiresIn: 3600 });
    }

    async stream(res: Response, name = ''): Promise<void> {
        let s3headers;
        try {
            s3headers = await s3.send(new S3.HeadObjectCommand(this.params));
        } catch (err) {
            if ((err as { Code?: string }).Code === 'NoSuchKey') throw new Err(404, null, 'No File Found');
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Internal Error');
        }

        const s3request = await s3.send(new S3.GetObjectCommand(this.params));

        res.writeHead(200, {
            'Content-Disposition': `inline; filename="${name}"`,
            'Content-Length': String(s3headers.ContentLength),
            'Content-Type': s3headers.ContentType ?? 'application/octet-stream',
            // Job output objects are never overwritten once written, so it's safe to cache
            // the success response indefinitely. The 404 thrown above (object not yet
            // generated) is unaffected and stays subject to the API's default no-store.
            'Cache-Control': 'public, max-age=31536000, immutable',
        });

        (s3request.Body as Readable).pipe(res);
    }

    async sample(): Promise<Array<Record<string, unknown>>> {
        const buffer: Array<Record<string, unknown>> = [];
        const req = await s3.send(new S3.GetObjectCommand(this.params));

        return new Promise((resolve, reject) => {
            const zlibstream = zlib.createGunzip();
            zlibstream.on('error', error);

            const input = (req.Body as Readable).pipe(zlibstream);

            readline.createInterface({
                input: input,
            }).on('line', (line) => {
                if (buffer.length <= 20) {
                    buffer.push(JSON.parse(line));

                    if (buffer.length === 20) {
                        return resolve(buffer);
                    }
                }
            }).on('error', error);

            function error(err: Error) {
                // Zlib will often complain the stream is cut short
                // If we've already returned the 20 required lines, ignore eit
                if (buffer.length < 20) {
                    return resolve(buffer);
                } else {
                    return reject(new Error(String(err)));
                }
            }
        });
    }
}
