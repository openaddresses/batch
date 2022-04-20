'use strict';
const { Err } = require('@openaddresses/batch-schema');
const AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: process.env.AWS_DEFAULT_REGION });

/**
 * @class
 */
class Upload {
    static async put(uid, name, stream) {
        try {
            const key = `${process.env.StackName}/upload/${uid}/${Math.random().toString(36).substring(2, 15)}/${name}`;
            console.error(`${process.env.StackName}/upload/${uid}/${Math.random().toString(36).substring(2, 15)}/${name}`);

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

module.exports = Upload;
