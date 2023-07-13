#!/usr/bin/env node
import { interactive } from './lib/pre.js';

import Meta from './lib/meta.js';
import ogr2ogr from 'ogr2ogr';
import { pipeline } from 'stream/promises';
import fs from 'fs';
import path from 'path';
import { mkdirp } from 'mkdirp';
import AWS from 'aws-sdk';
import { Unzip } from 'zlib';
import archiver from 'archiver';
import minimist from 'minimist';

const s3 = new AWS.S3({
    region: process.env.AWS_DEFAULT_REGION
});

const r2 = new AWS.S3({
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    },
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
});

const DRIVE = '/tmp';

const args = minimist(process.argv, {
    boolean: ['interactive'],
    alias: {
        interactive: 'i'
    }
});

if (import.meta.url === `file://${process.argv[1]}`) {
    if (args.interactive) {
        prompt();
    } else {
        cli();
    }
}

async function prompt() {
    await interactive([{
        type: 'text',
        message: 'OA Export ID',
        name: 'OA_EXPORT_ID'
    }]);

    return cli();
}

async function cli() {
    if (!process.env.StackName) process.env.StackName = 'batch-prod';
    if (!process.env.Bucket) process.env.Bucket = 'v2.openaddreses.io';

    if (!process.env.SharedSecret) throw new Error('No SharedSecret env var defined');
    if (!process.env.OA_EXPORT_ID) throw new Error('No OA_EXPORT_ID env var defined');
    if (!process.env.OA_API) throw new Error('No OA_API env var defined');

    const meta = new Meta();

    const OA = (await import('@openaddresses/lib')).default;
    const oa = new OA({
        url: process.env.OA_API,
        secret: process.env.SharedSecret
    });

    try {
        await meta.load();
        await meta.protection(true);

        const exp = await oa.cmd('export', 'get', {
            ':exportid': parseInt(process.env.OA_EXPORT_ID)
        });

        const job = await oa.cmd('job', 'get', {
            ':job': exp.job_id
        });

        const update = {
            ':exportid': parseInt(process.env.OA_EXPORT_ID),
            status: 'Running'
        };

        if (process.env.AWS_BATCH_JOB_ID) {
            update.loglink = meta.loglink;
        }

        await oa.cmd('export', 'update', update);

        const tmp = path.resolve(DRIVE, Math.random().toString(36).substring(2, 15));
        await mkdirp(path.resolve(tmp));
        await mkdirp(path.resolve(tmp, './export'));

        console.error(`ok - tmp: ${tmp}`);

        console.error(`ok - fetching ${process.env.Bucket}/${process.env.StackName}/job/${exp.job_id}/source.geojson.gz`);
        const loc = await get_source(tmp, exp.job_id);
        console.error(`ok - fetched: ${loc}`);

        await convert(tmp, loc, exp, job);
        console.error('ok - converted');

        await s3.upload({
            ContentType: 'application/zip',
            Bucket: process.env.Bucket,
            Key: `${process.env.StackName}/export/${exp.id}/export.zip`,
            Body: fs.createReadStream(path.resolve(tmp, 'export.zip'))
        }).promise();
        console.error(`ok - uploaded: s3://${process.env.Bucket}/${process.env.StackName}/export/${exp.id}/export.zip`);

        await r2.upload({
            ContentType: 'application/zip',
            Bucket: process.env.R2Bucket,
            Key: `v2.openaddresses.io/${process.env.StackName}/export/${exp.id}/export.zip`,
            Body: fs.createReadStream(path.resolve(tmp, 'export.zip'))
        }).promise();
        console.error(`ok - uploaded: r2://${process.env.R2Bucket}/v2.openaddresses.io/${process.env.StackName}/export/${exp.id}/export.zip`);

        await oa.cmd('export', 'update', {
            ':exportid': process.env.OA_EXPORT_ID,
            size: fs.statSync(path.resolve(tmp, 'export.zip')).size,
            status: 'Success'
        });

        console.error('ok - done');
        await meta.protection(false);
    } catch (err) {
        console.error(err);

        try {
            await oa.cmd('export', 'update', {
                ':exportid': parseInt(process.env.OA_EXPORT_ID),
                status: 'Fail'
            });
        } finally {
            await meta.protection(false);
            process.exit(1);
        }
    }
}

function archive(tmp) {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(path.resolve(tmp, 'export.zip'))
            .on('error', (err) => {
                console.error('not ok - ' + err.message);
                return reject(err);
            }).on('close', () => {
                return resolve(path.resolve(tmp, 'export.zip'));
            });

        const arch = archiver('zip', {
            zlib: { level: 9 }
        }).on('warning', (err) => {
            console.error('not ok - WARN: ' + err);
        }).on('error', (err) => {
            return reject(err);
        });

        arch.pipe(output);

        for (const f of fs.readdirSync(path.resolve(tmp, './export'))) {
            arch.file(path.resolve(path.resolve(tmp, './export', f)), {
                name: f
            });
        }

        arch.finalize();
    });
}

function convert(tmp, loc, exp, job) {
    let timeout = 600000;
    if (
        job.source_name.match(/statewide$/)
        || job.source_name.match(/provincewide$/)
        || job.source_name.match(/regionwide$/)
    ) {
        timeout = timeout * 2;
    } else if (job.source_name.match(/countrywide$/)) {
        timeout = timeout * 4;
    }

    let ogr = ogr2ogr(loc)
        .timeout(timeout)
        .skipfailures()
        .onStderr((data) => {
            console.error(data);
        });

    if (exp.format === 'shapefile') {
        return new Promise((resolve, reject) => {
            const inp = ogr.format('ESRI Shapefile').stream();
            const out = fs.createWriteStream(path.resolve(tmp, 'export.zip'));

            out.on('error', reject);
            inp.on('error', reject);
            out.on('close', resolve);

            inp.pipe(out);
        });
    } else if (exp.format === 'csv') {
        ogr = ogr.format('csv');

        if (job.layer === 'addresses') {
            ogr = ogr.options(['-lco', 'GEOMETRY=AS_XY']);
        } else {
            ogr = ogr.options(['-lco', 'GEOMETRY=AS_WKT']);
        }

        return new Promise((resolve, reject) => {
            const inp = ogr.stream();
            const out = fs.createWriteStream(path.resolve(tmp, './export', 'export.csv'));

            out.on('error', reject);
            inp.on('error', reject);
            out.on('close', async () => {
                await archive(tmp);
                return resolve();
            });

            inp.pipe(out);
        });
    }
}

async function get_source(tmp, jobid) {
    await pipeline(
        s3.getObject({
            Bucket: process.env.Bucket,
            Key: `${process.env.StackName}/job/${jobid}/source.geojson.gz`
        }).createReadStream(),
        Unzip(),
        fs.createWriteStream(path.resolve(tmp, 'source.geojson'))
    );

    return path.resolve(tmp, 'source.geojson');
}
