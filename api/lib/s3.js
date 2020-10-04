'use strict';

const AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: process.env.AWS_DEFAULT_REGION });
const readline = require('readline');
const zlib = require('zlib');

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

    async sample() {
        return new Promise((resolve, reject) => {
            const buffer = [];
            const req = s3.getObject(this.params);
            const s3stream = req
                .createReadStream()
                .pipe(zlib.createGunzip());

            new readline.createInterface({
                input: s3stream
            }).on('line', (line) => {
                if (buffer.length <= 20) {
                    buffer.push(JSON.parse(line));

                    if (buffer.length === 21) {
                        req.abort();
                        return resolve(buffer);
                    }
                }
            }).on('error', (err) => {
                return reject(err);
            });
        });
    }
}

module.exports = S3;
