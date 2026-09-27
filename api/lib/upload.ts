import Err from '@openaddresses/batch-error';
import S3 from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import type { Readable } from 'node:stream';

const s3 = new S3.S3Client({ region: process.env.AWS_DEFAULT_REGION });

/**
 * @class
 */
export default class S3Upload {
    static async put(uid: number | false, name: string, stream: Readable): Promise<{ url: string }> {
        try {
            const key = `${process.env.StackName}/upload/${uid}/${Math.random().toString(36).substring(2, 15)}/${name}`;

            const s3uploader = new Upload({
                client: s3,
                params: {
                    Bucket: process.env.Bucket,
                    ACL: 'public-read',
                    Key: key,
                    Body: stream,
                },
            });

            await s3uploader.done();

            return {
                url: ` https://${process.env.Bucket}/${key}`,
            };
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Failed to upload file');
        }
    }
}
