'use strict';

const Ajv = require('ajv');
const JobError = require('./joberror');
const turf = require('@turf/turf');
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
const Stats = require('./stats');

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
        this.run = false;
        this.source = false;
        this.layer = layer;
        this.name = name;
        this.bounds = [];
        this.count = 0;
        this.stats = {};

        this.assets = {
            cache: false,
            output: false,
            preview: false
        };
    }

    get(api) {
        return new Promise((resolve, reject) => {
            request({
                url: `${api}/api/job/${this.job}`,
                json: true,
                method: 'GET'
            }, (err, res) => {
                if (err) return reject(err);
                this.run = res.body.run;

                return resolve();
            });
        });
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

    async convert() {
        let output;

        try {
            output = await Job.find('out.csv', this.tmp);
        } catch (err) {
            throw new Error(err);
        }

        return new Promise((resolve, reject) => {
            if (output.length !== 1) return reject(new Error('out.csv not found'));

            pipeline(
                fs.createReadStream(output[0]),
                csv({
                    delimiter: ','
                }),
                transform(100, (data, cb) => {
                    if (data[2] === 'NUMBER' && data[3] === 'STREET') {
                        return cb(null, '');
                    }

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
                            coordinates: [
                                Number(data[0]),
                                Number(data[1])
                            ]
                        }
                    }) + '\n');
                }),
                fs.createWriteStream(path.resolve(this.tmp, 'out.geojson')),
                async (err) => {
                    if (err) return reject(err);

                    try {
                        const stats = new Stats(path.resolve(this.tmp, 'out.geojson'), this.layer);
                        await stats.calc();

                        this.bounds = turf.bboxPolygon(stats.stats.bounds).geometry;
                        this.count = stats.stats.count;
                        this.stats = stats.stats[stats.layer];
                    } catch (err) {
                        return reject(new Error(err));
                    }

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
                body: body,
                headers: {
                    'shared-secret': process.env.SharedSecret
                }
            }, (err, res) => {
                if (err) return reject(err);

                return resolve(res.body);
            });
        });
    }

    compare(api) {
        return new Promise((resolve, reject) => {
            request({
                url: `${api}/api/job/${this.job}/delta`,
                json: true,
                method: 'GET'
            }, (err, res) => {
                if (err) return reject(err);

                return resolve(res.body);
            });
        });
    }

    async check(api, run) {
        const diff = await this.compare(api);

        // New Source
        if (diff && diff.message && diff.message === 'Job does not match a live job') {
            return true;
        }

        // 10% reduction or greater is bad
        if (diff.delta.count / diff.master.count <= -0.1) {
            await this.update(api, { status: 'Warn' });
            if (run.live) await JobError.create(api, this.job, `Feature count dropped by ${Math.round((diff.delta.count / diff.master.count <= -0.1) * 100) / 100}`);
        }

        if (this.job.layer === 'addresses') {
            const number = diff.delta.stats.counts.number / diff.master.stats.counts.number;
            if (number <= -0.1) {
                await this.update(api, { status: 'Warn' });
                if (run.live) await JobError.create(api, this.job, `"number" prop dropped by ${Math.round(number * 100) / 100}`);
            }

            const street = diff.delta.stats.counts.street / diff.master.stats.counts.street;
            if (street <= -0.1) {
                await this.update(api, { status: 'Warn' });
                if (run.live) await JobError.create(api, this.job, `"number" prop dropped by ${Math.round(street * 100) / 100}`);
            }
        }

        return true;
    }
}

module.exports = Job;
