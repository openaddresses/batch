import Err from '@openaddresses/batch-error';
import AWS from 'aws-sdk';

/**
 * @class
 */
export default class Upload {
    static async put(uid, name, stream) {
        const s3 = new AWS.S3({ region: process.env.AWS_DEFAULT_REGION });

        try {
            const key = `${process.env.StackName}/upload/${uid}/${Math.random().toString(36).substring(2, 15)}/${name}`;

            await s3.upload({
                Bucket: process.env.Bucket,
                ACL: 'public-read',
                Key: key,
                Body: stream
            }).promise();

            return {
                url: ` https://${process.env.Bucket}/${key}`
            };
        } catch (err) {
            throw new Err(500, err, 'Failed to upload file');
        }
    }
}

