'use strict';

const Ajv = require('ajv');
const wkt = require('wellknown');
const turf = require('@turf/turf');
const gzip = require('zlib').createGzip;
const os = require('os');
const fs = require('fs');
const path = require('path');
const request = require('request');
const { pipeline } = require('stream');
const csv = require('csv-parse');
const AWS = require('aws-sdk');
const schema_v2 = require('oa').schema['2'];
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

/**
 * @class Job
 */
class Job {
    constructor(oa, job) {
        if (!oa) throw new Error('OA Instance required');
        if (!job) throw new Error('job param required');

        this.oa = oa;
        this.tmp = path.resolve(os.tmpdir(), Math.random().toString(36).substring(2, 15));

        fs.mkdirSync(this.tmp);

        // pending => processed => uploaded
        this.status = 'pending';

        this.job = parseInt(job);
        this.run = false;
        this.source = false;
        this.layer = false;
        this.name = false;
        this.bounds = [];
        this.count = 0;
        this.stats = {};
        this.size = 0;

        // Store the specific data/conform information for a source
        this.specific = false;

        this.assets = {
            cache: false,
            output: false,
            preview: false
        };
    }

    async get() {
        const job = await this.oa.cmd('job', 'get', {
            ':job': this.job
        });

        this.run = job.run;
        this.source = job.source;
        this.layer = job.layer;
        this.name = job.name

        return job;
    }

    fetch() {
        return new Promise((resolve, reject) => {
            request({
                url: this.source,
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

                for (const l of this.source.layers[this.layer]) {
                    if (l.name === this.name) this.specific = l;
                }

                return resolve(this.source);
            });
        });
    }

    static find(pattern, path) {
        return new Promise((resolve) => {
            find.file(pattern, path, resolve);
        });
    }

    /**
     * Detect if the source is a static S3 asset, and download it from S3 instead of http
     */
    s3_down() {
        return new Promise((resolve, reject) => {
            if (!this.specific.protocol === 'http') return resolve();
            if (!this.specific.data.includes('data.openaddresses.io') && this.specific.data.includes('v2.openaddresses.io')) return resolve();

            const url = new URL(this.specific.data);

            const loc = path.resolve(this.tmp, url.pathname.replace(/^\//, '').replace(/\//g, '-'));

            const out = fs.createWriteStream(loc).on('error', (err) => {
                return reject(err);
            }).on('close', () => {
                this.specific.protocol = 'file';
                this.specific.data = `file://${loc}`;
                return resolve();
            });

            s3.getObject({
                Bucket: url.host,
                Key: url.pathname.replace(/^\//, '')
            }).createReadStream().on('error', (err) => {
                return reject(err);
            }).pipe(out);
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
                    columns: true,
                    delimiter: ','
                }),
                transform(100, (data, cb) => {
                    const geom = wkt.parse(data.GEOM);
                    delete data.GEOM;
                    const props = {};
                    for (const prop of Object.keys(data)) {
                        props[prop.toLowerCase()] = data[prop];
                    }

                    return cb(null, JSON.stringify({
                        type: 'Feature',
                        properties: props,
                        geometry: geom
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
                    ContentType: 'application/zip',
                    Bucket: process.env.Bucket,
                    Key: `${process.env.StackName}/job/${this.job}/cache.zip`,
                    Body: fs.createReadStream(cache[0])
                }).promise();

                console.error('ok - cache.zip uploaded');
                this.assets.cache = true;
            }

            const data = path.resolve(this.tmp, 'out.geojson.gz');

            this.size = fs.statSync(data).size;

            await s3.putObject({
                ContentType: 'application/gzip',
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
                    ContentType: 'image/png',
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
            const url = `${api}/api/job/${this.job}/delta`;
            console.error(`ok - GET: ${url}`);

            request({
                url: url,
                json: true,
                method: 'GET'
            }, (err, res) => {
                if (err) return reject(err);
                console.error(res.body);

                return resolve(res.body);
            });
        });
    }

    async check_source() {
        if (this.specific.skip) {
            await this.oa.cmd('joberror', 'create', {
                job: this.job,
                message: 'Job has skip: true flag enabled'
            });
        }

        if (!this.specific.year && this.specific.protocol === 'file') {
            await this.oa.cmd('joberror', 'create', {
                job: this.job,
                message: 'Job has cached data without the year it was cached'
            });
        }

        if (this.specific.year && parseInt(this.specific.year) !== new Date().getFullYear()) {
            await this.oa.cmd('joberror', 'create', {
                job: this.job,
                message: `Job has year: ${this.specific.year} which is not the current year`
            });
        }

        return true;
    }

    async check_stats(api, run) {
        const diff = await this.compare(api);

        // New Source
        if (diff && diff.message && diff.message === 'Job does not match a live job') {
            return true;
        }

        // 10% reduction or greater is bad
        if (diff.delta.count / diff.master.count <= -0.1) {
            await this.update(api, { status: 'Warn' });
            if (run.live) {
                await this.oa.cmd('joberror', 'create', {
                    job: this.job,
                    message: `Feature count dropped by ${Math.round((diff.delta.count / diff.master.count <= -0.1) * 100) / 100}`
                });
            }
        }

        if (this.job.layer === 'addresses') {
            const number = diff.delta.stats.counts.number / diff.master.stats.counts.number;
            if (number <= -0.1) {
                await this.update(api, { status: 'Warn' });
                if (run.live) {
                    await this.oa.cmd('joberror', 'create', {
                        job: this.job,
                        message: `"number" prop dropped by ${Math.round(number * 100) / 100}`
                    });
                }
            }

            const street = diff.delta.stats.counts.street / diff.master.stats.counts.street;
            if (street <= -0.1) {
                await this.update(api, { status: 'Warn' });
                if (run.live) {
                    await this.oa.cmd('joberror', 'create', {
                        job: this.job,
                        message: `"number" prop dropped by ${Math.round(street * 100) / 100}`
                    });
                }
            }
        }

        return true;
    }
}

module.exports = Job;
