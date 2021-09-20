

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

            const zlibstream = zlib.createGunzip();
            zlibstream.on('error', error);

            const s3stream = req.createReadStream();
            s3stream.on('error', error);

            const input = s3stream.pipe(zlibstream);

            new readline.createInterface({
                input: input
            }).on('line', (line) => {
                if (buffer.length <= 20) {
                    buffer.push(JSON.parse(line));

                    if (buffer.length === 20) {
                        req.abort();
                        return resolve(buffer);
                    }
                }
            }).on('error', error);

            function error(err) {
                // Zlib will often complain the stream is cut short
                // If we've already returned the 20 required lines, ignore eit
                if (buffer.length < 20) {
                    return resolve(buffer);
                } else {
                    return reject(new Error(err));
                }
            }
        });
    }
}

module.exports = S3;
