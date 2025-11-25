import S3 from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2 = new S3.S3Client({
    region: 'auto',
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    },
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
});

/**
 * @class
 */
export default class R2Helper {
    constructor(params) {
        this.params = params;
    }

    async url() {
        const command = new S3.GetObjectCommand(this.params);
        return await getSignedUrl(r2, command, { expiresIn: 3600 });
    }
}
