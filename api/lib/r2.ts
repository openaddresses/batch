import S3 from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2 = new S3.S3Client({
    region: 'auto',
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
    },
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
});

/**
 * @class
 */
export default class R2Helper {
    params: S3.GetObjectCommandInput;

    constructor(params: S3.GetObjectCommandInput) {
        this.params = params;
    }

    async url(): Promise<string> {
        const command = new S3.GetObjectCommand(this.params);
        return await getSignedUrl(r2, command, { expiresIn: 3600 });
    }
}
