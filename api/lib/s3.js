'use strict';

const AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: process.env.AWS_DEFAULT_REGION });

class S3 {
    constructor(params) {
        this.params = params;
    }

    stream(res, name) {
        const s3request = s3.getObject(this.params);
        const s3stream = s3request.createReadStream();

        s3request.on('httpHeaders', (statusCode, headers) => {
            headers['Content-disposition'] = `inline; filename="${name}"`;

            res.writeHead(statusCode, headers);
        });

        s3stream.on('error', () => {
            // Could not find object, ignore
        });

        s3stream.pipe(res);
    }
}

module.exports = S3;
