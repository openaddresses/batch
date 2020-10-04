'use strict';

const AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: process.env.AWS_DEFAULT_REGION });
const split = require('split');
const util = require('util');
const stream = require('stream');
const pipeline = util.promisify(stream.pipeline);
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

    async sample(name) {
        try {
            console.error(this.params)
            await pipeline(
                s3.getObject(this.params).createReadStream(),
                zlib.Gunzip,
                split(),
                async function* (source) {
                    source.setEncoding('utf8');
                    for await (const chunk of source) {
                        console.error(chunk)
                        yield chunk.toUpperCase();
                    }
                },
            );
        } catch (err) {
            throw new Error(err);
        }
    }
}

module.exports = S3;
