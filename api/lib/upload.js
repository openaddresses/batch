'use strict';

const Err = require('./error');
const AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: process.env.AWS_DEFAULT_REGION });

/**
 * @class Upload
 */
class Upload {
    static async put(uid, name, stream) {
        return new Promise((resolve, reject) => {
            console.error(`${process.env.stackName}/upload/${uid}/${Math.random().toString(36).substring(2, 15)}/${name}`);
            s3.upload({
                Bucket: process.env.Bucket,
                ACL: 'public-read',
                Key: `${process.env.stackName}/upload/${uid}/${Math.random().toString(36).substring(2, 15)}/${name}`,
                Body: stream
            }, (err, res) => {
                if (err) return reject(new Err(500, err, 'Failed to upload file'));

                return resolve({
                    url: `${process.env.stackName}/upload/${uid}/${Math.random().toString(36).substring(2, 15)}/${name}`
                });
            });
        });
    }
}

module.exports = Upload;
