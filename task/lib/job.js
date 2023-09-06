import wkt from 'wellknown';
import {
    bboxPolygon
} from '@turf/turf';
import { createGzip } from 'zlib';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'node:stream/promises';
import { parse as csv } from 'csv-parse';
import S3 from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import Stats from './stats.js';
import find from 'find';
import { Transform } from 'stream';

/**
 * @class Job
 */
export default class Job {
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

        // Was a validated file created
        this.validated = false;

        // Store the specific data/conform information for a source
        this.specific = false;

        this.assets = {
            cache: false,
            output: false,
            preview: false,
            validated: false
        };
    }

    async get() {
        const job = await this.oa.cmd('job', 'get', {
            ':job': this.job
        });

        this.run = job.run;
        this.source = job.source;
        this.layer = job.layer;
        this.name = job.name;

        return job;
    }

    async fetch() {
        const source = await this.oa.cmd('job', 'raw', {
            ':job': this.job
        });

        if (
            !source
            || !source.schema
            || typeof source.schema !== 'number'
            || source.schema !== 2
        ) {
            throw new Error('Source missing schema: 2');
        }

        const OASchema = (await import('oa')).default;
        const validate = await OASchema.compile(true);
        const valid = validate(source);

        if (!valid) {
            console.error(JSON.stringify(validate.errors));
            throw new Error('Source does not conform to V2 schema');
        }

        this.source = source;

        for (const l of this.source.layers[this.layer]) {
            if (l.name === this.name) this.specific = l;
        }

        return this.source;
    }

    static find(pattern, path) {
        return new Promise((resolve) => {
            find.file(pattern, path, resolve);
        });
    }

    /**
     * Detect if the source is a static S3 asset, and download it from S3 instead of http
     *
     * @returns {Promise}
     */
    async s3_down() {
        if (this.specific.protocol !== 'http') return;
        if (!this.specific.data.includes('data.openaddresses.io') && !this.specific.data.includes('v2.openaddresses.io')) return;

        const url = new URL(this.specific.data);

        const loc = path.resolve(this.tmp, url.pathname.replace(/^\//, '').replace(/\//g, '-'));
        this.specific.protocol = 'file';
        this.specific.data = `file://${loc}`;

        const s3 = new S3.S3Client({ region: 'us-east-1' });
        await pipeline(
            (await s3.send(new S3.GetObjectCommand({
                Bucket: url.host,
                Key: url.pathname.replace(/^\//, '')
            }))).Body,
            fs.createWriteStream(loc)
        );
    }

    async validate() {
        const stats = new Stats(new URL(path.resolve(this.tmp, './out.geojson'), 'file:///'), this.layer);

        await stats.calc();

        this.validated = stats.validated_path;
        console.error(`ok - validated: ${this.validated}`);

        this.bounds = bboxPolygon(stats.stats.bounds).geometry;
        this.count = stats.stats.count;
        this.stats = stats.stats[stats.layer];
    }

    async convert() {
        let output;

        try {
            output = await Job.find('out.csv', this.tmp);
        } catch (err) {
            throw new Error(err);
        }

        if (output.length !== 1) throw new Error('out.csv not found');

        await pipeline(
            fs.createReadStream(output[0]),
            csv({
                columns: true,
                skip_empty_lines: true,
                delimiter: ','
            }),
            new Transform({
                objectMode: true,
                transform: (data, _, cb) => {
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
                }
            }),
            fs.createWriteStream(path.resolve(this.tmp, 'out.geojson'))
        );

        return path.resolve(this.tmp, 'out.geojson');
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

        return await Job.gz(new URL(data[0], 'file://'));
    }

    static async gz(input) {
        if (!(input instanceof URL)) throw new Error('input arg must be URL');

        const compressed = new URL(input.pathname + '.gz', 'file://');

        await pipeline(
            fs.createReadStream(input),
            createGzip(),
            fs.createWriteStream(compressed)
        );

        return compressed;
    }

    async upload() {
        if (this.status !== 'processed') {
            return new Error('job state must be "processed" to perform asset upload');
        }

        const s3 = new S3.S3Client({ region: 'us-east-1' });

        const r2 = new S3.S3Client({
            region: 'auto',
            credentials: {
                accessKeyId: process.env.R2_ACCESS_KEY_ID,
                secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
            },
            endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
        });

        const cache = await Job.find('cache.zip', this.tmp);
        if (cache.length === 1) {
            console.error('ok - found cache', cache[0]);

            const s3uploader = new Upload({
                client: s3,
                params: {
                    ContentType: 'application/zip',
                    Bucket: process.env.Bucket,
                    Key: `${process.env.StackName}/job/${this.job}/cache.zip`,
                    Body: fs.createReadStream(cache[0])
                }
            });

            await s3uploader.done();

            const r2uploader = new Upload({
                client: r2,
                params: {
                    ContentType: 'application/zip',
                    Bucket: process.env.R2Bucket,
                    Key: `v2.openaddresses.io/${process.env.StackName}/job/${this.job}/cache.zip`,
                    Body: fs.createReadStream(cache[0])
                }
            });

            await r2uploader.done();

            console.error('ok - cache.zip uploaded');
            this.assets.cache = true;
        }

        const data = path.resolve(this.tmp, 'out.geojson.gz');

        this.size = fs.statSync(data).size;

        const s3uploader = new Upload({
            client: s3,
            params: {
                ContentType: 'application/gzip',
                Bucket: process.env.Bucket,
                Key: `${process.env.StackName}/job/${this.job}/source.geojson.gz`,
                Body: fs.createReadStream(data)
            }
        });

        await s3uploader.done();

        const r2uploader = new Upload({
            client: r2,
            params: {
                ContentType: 'application/gzip',
                Bucket: process.env.R2Bucket,
                Key: `v2.openaddresses.io/${process.env.StackName}/job/${this.job}/source.geojson.gz`,
                Body: fs.createReadStream(data)
            }
        });

        await r2uploader.done();

        console.error('ok - source.geojson.gz uploaded');
        this.assets.output = true;

        if (this.validated) {
            this.validated = await Job.gz(this.validated);

            const s3uploader = new Upload({
                client: s3,
                params: {
                    ContentType: 'application/gzip',
                    Bucket: process.env.Bucket,
                    Key: `${process.env.StackName}/job/${this.job}/validated.geojson.gz`,
                    Body: fs.createReadStream(this.validated)
                }
            });

            await s3uploader.done();

            const r2uploader = new Upload({
                client: r2,
                params: {
                    ContentType: 'application/gzip',
                    Bucket: process.env.R2Bucket,
                    Key: `v2.openaddresses.io/${process.env.StackName}/job/${this.job}/validated.geojson.gz`,
                    Body: fs.createReadStream(this.validated)
                }
            });

            await r2uploader.done();

            console.error('ok - validated.geojson.gz uploaded');
            this.assets.validated = true;
        } else {
            console.error('ok - validated geojson not found');
        }

        const preview = await Job.find('preview.png', this.tmp);
        if (preview.length === 1) {
            console.error('ok - found preview', preview[0]);

            const s3uploader = new Upload({
                client: s3,
                params: {
                    ContentType: 'image/png',
                    Bucket: process.env.Bucket,
                    Key: `${process.env.StackName}/job/${this.job}/source.png`,
                    Body: fs.createReadStream(preview[0])
                }
            });

            await s3uploader.done();

            const r2uploader = new Upload({
                client: r2,
                params: {
                    ContentType: 'image/png',
                    Bucket: process.env.R2Bucket,
                    Key: `v2.openaddresses.io/${process.env.StackName}/job/${this.job}/source.png`,
                    Body: fs.createReadStream(preview[0])
                }
            });

            await r2uploader.done();

            console.error('ok - source.png uploaded');
            this.assets.preview = true;
        }

        this.status = 'uploaded';

        return this.assets;
    }

    async update(body) {
        console.error(`ok - updating job: ${this.job} with ${JSON.stringify(body)}`);

        const update = await this.oa.cmd('job', 'update', Object.assign({
            ':job': this.job
        }, body));

        return update;
    }

    async compare() {
        const delta = await this.oa.cmd('job', 'update', {
            ':job': this.job
        });

        return delta;
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

    async check_stats(run, diff) {
        // 10% reduction or greater is bad
        if (diff.compare.count / diff.master.count <= 0.9) {
            await this.update({ status: 'Warn' });
            if (run.live) {
                await this.oa.cmd('joberror', 'create', {
                    job: this.job,
                    message: `Feature count dropped by ${diff.master.count - diff.compare.count}`
                });
            }
        }

        if (this.layer === 'addresses') {
            if (diff.compare.stats.counts.number / diff.master.stats.counts.number <= 0.9) {
                await this.update({ status: 'Warn' });
                if (run.live) {
                    await this.oa.cmd('joberror', 'create', {
                        job: this.job,
                        message: `"number" prop dropped by ${diff.master.stats.counts.number - diff.compare.stats.counts.number}`
                    });
                }
            }

            if (diff.compare.stats.counts.street / diff.master.stats.counts.street <= 0.9) {
                await this.update({ status: 'Warn' });
                if (run.live) {
                    await this.oa.cmd('joberror', 'create', {
                        job: this.job,
                        message: `"street" prop dropped by ${diff.master.stats.counts.street - diff.compare.stats.counts.street}`
                    });
                }
            }

            if (diff.compare.stats.counts.number === 0) {
                await this.update({ status: 'Warn' });
                if (run.live) {
                    await this.oa.cmd('joberror', 'create', {
                        job: this.job,
                        message: 'Number fields are all empty'
                    });
                }
            }

            if (diff.compare.stats.counts.street === 0) {
                await this.update({ status: 'Warn' });
                if (run.live) {
                    await this.oa.cmd('joberror', 'create', {
                        job: this.job,
                        message: 'Street fields are all empty'
                    });
                }
            }

            if (diff.compare.stats.validity.valid === 0) {
                await this.update({ status: 'Warn' });
                if (run.live) {
                    await this.oa.cmd('joberror', 'create', {
                        job: this.job,
                        message: 'No Valid Address Features'
                    });
                }
            }
        }

        return true;
    }
}
