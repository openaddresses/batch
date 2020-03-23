'use strict';

const Ajv = require('ajv');
const gzip = require('zlib').createGzip;
const os = require('os');
const fs = require('fs');
const path = require('path');
const request = require('request');
const { pipeline } = require('stream');
const csv = require('csv-parse');
const AWS = require('aws-sdk');
const schema_v2 = require('./source_schema_v2.json');
const transform = require('parallel-transform');

const ajv = new Ajv({
    schemaId: 'auto'
});

ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'), 'http://json-schema.org/draft-04/schema#');
ajv.addMetaSchema(require('./geojson.json'), 'http://json.schemastore.org/geojson#/definitions/geometry');

const validate = ajv.compile(schema_v2);

const find = require('find');
const s3 = new AWS.S3({
    region: 'us-east-1'
});

class Job {
    constructor(job, url, layer, name) {
        if (!job) throw new Error('job param required');
        if (!url) throw new Error('url param required');
        if (!layer) throw new Error('layer param required');
        if (!name) throw new Error('name param required');

        this.tmp = path.resolve(os.tmpdir(), Math.random().toString(36).substring(2, 15));

        fs.mkdirSync(this.tmp);

        // pending => processed => uploaded
        this.status = 'pending';

        this.job = job;
        this.url = url;
        this.source = false;
        this.layer = layer;
        this.name = name;

        this.assets = {
            cache: false,
            output: false,
            preview: false
        };
    }

    fetch() {
        return new Promise((resolve, reject) => {
            request({
                url: this.url,
                method: 'GET'
            }, (err, res) => {
                if (err) return reject(err);

                let source = false;
                try {
                    source = JSON.parse(res.body);
                } catch (err) {
                    return reject(err);
                }

                if (
                    !source
                    || !source.schema
                    || typeof source.schema !== 'number'
                    || source.schema !== 2
                ) {
                    return reject(new Error('Source missing schema: 2'));
                }

                const valid = validate(source);

                if (!valid) {
                    console.error(JSON.stringify(validate.errors));
                    return reject(new Error('Source does not conform to V2 schema'));
                }

                this.source = source;

                return resolve(this.source);
            });
        });
    }

    static find(pattern, path) {
        return new Promise((resolve) => {
            find.file(pattern, path, resolve);
        });
    }

    convert() {
        return new Promise(async (resolve, reject) => {
            const output = await Job.find('out.csv', this.tmp);

            if (output.length !== 1) return reject(new Error('out.csv not found'));

            pipeline(
                fs.createReadStream(output[0]),
                csv({
                    delimiter: ','
                }),
                transform(100, (data, cb) => {
                    return cb(null, JSON.stringify({
                        type: 'Feature',
                        properties: {
                            id: data[9],
                            unit: data[4],
                            number: data[2],
                            street: data[3],
                            city: data[5],
                            district: data[6],
                            region: data[7],
                            postcode: data[8],
                            hash: data[10]
                        },
                        geometry: {
                            type: 'Point',
                            coordinates: [data[0], data[1]]
                        }
                    }) + '\n');
                }),
                fs.createWriteStream(path.resolve(this.tmp, 'out.geojson')),
                (err) => {
                    if (err) return reject(err);

                    return resolve(path.resolve(this.tmp, 'out.geojson'));
                }
            );
        });
    }

    async compress() {
        let data = [];
        try {
            data = await Job.find('out.geojson', this.tmp);
        } catch (err) {
            throw new Error(err);
        }

        if (!data || !data.length) {
            throw new Error('out.geojson not found');
        }

        return new Promise((resolve, reject) => {
            const compressed = data[0] + '.gz';

            pipeline(
                fs.createReadStream(data[0]),
                gzip(),
                fs.createWriteStream(compressed),
                (err) => {
                    if (err) return reject(err);

                    return resolve(compressed);
                }
            );
        });
    }

    async upload() {
        if (this.status !== 'processed') {
            return new Error('job state must be "processed" to perform asset upload');
        }

        try {
            const cache = await Job.find('cache.zip', this.tmp);
            if (cache.length === 1) {
                console.error('ok - found cache', cache[0]);

                await s3.putObject({
                    Bucket: process.env.Bucket,
                    Key: `${process.env.StackName}/job/${this.job}/cache.zip`,
                    Body: fs.createReadStream(cache[0])
                }).promise();

                console.error('ok - cache.zip uploaded');
                this.assets.cache = true;
            }

            const data = path.resolve(this.tmp, 'out.geojson.gz');
            await s3.putObject({
                Bucket: process.env.Bucket,
                Key: `${process.env.StackName}/job/${this.job}/source.geojson.gz`,
                Body: fs.createReadStream(data)
            }).promise();
            console.error('ok - source.geojson.gz uploaded');
            this.assets.output = true;

            const preview = await Job.find('preview.png', this.tmp);
            if (preview.length === 1) {
                console.error('ok - found preview', preview[0]);

                await s3.putObject({
                    Bucket: process.env.Bucket,
                    Key: `${process.env.StackName}/job/${this.job}/source.png`,
                    Body: fs.createReadStream(preview[0])
                }).promise();

                console.error('ok - source.png uploaded');
                this.assets.preview = true;
            }
        } catch (err) {
            throw new Error(err);
        }

        this.status = 'uploaded';

        return this.assets;
    }

    update(api, body) {
        return new Promise((resolve, reject) => {
            console.error(`ok - updating: ${api}/api/job/${this.job} with ${JSON.stringify(body)}`);

            request({
                url: `${api}/api/job/${this.job}`,
                json: true,
                method: 'PATCH',
                body: body
            }, (err, res) => {
                if (err) return reject(err);

                return resolve(res.body);
            });
        });
    }
}

module.exports = Job;
