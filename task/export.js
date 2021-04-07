#!/usr/bin/env node

'use strict';

require('./lib/pre');

const OA = require('lib-oa');
const prompts = require('prompts');
const Meta = require('./lib/meta');
const ogr2ogr = require('ogr2ogr');
const {pipeline} = require('stream');
const request = require('request');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp').sync;
const AWS = require('aws-sdk');
const {Unzip} = require('zlib');
const archiver = require('archiver');

const s3 = new AWS.S3({
    region: process.env.AWS_DEFAULT_REGION
});

const DRIVE = '/tmp';

const args = require('minimist')(process.argv, {
    boolean: ['interactive'],
    alias: {
        interactive: 'i'
    }
});

if (require.main === module) {
    if (args.interactive) return prompt();
    return cli();
}

async function prompt() {
    const p = await prompts([{
        type: 'text',
        name: 'OA_API',
        message: 'OA API Base URL',
        initial: 'http://localhost:5000'
    },{
        type: 'text',
        name: 'Bucket',
        message: 'AWS S3 bucket to push results to',
        initial: 'v2.openaddresses.io'
    },{
        type: 'text',
        message: 'OA Export ID',
        name: 'OA_EXPORT_ID'
    },{
        type: 'text',
        name: 'SharedSecret',
        message: 'OA API SharedSecret',
        initial: '123'
    }]);

    Object.assign(process.env, p);

    return cli();
}

async function cli() {
    if (!process.env.StackName) process.env.StackName = 'batch-prod';
    if (!process.env.Bucket) process.env.Bucket = 'v2.openaddreses.io';

    if (!process.env.SharedSecret) throw new Error('No SharedSecret env var defined');
    if (!process.env.OA_EXPORT_ID) throw new Error('No OA_EXPORT_ID env var defined');
    if (!process.env.OA_API) throw new Error('No OA_API env var defined');

    const meta = new Meta();
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

        await oa.cmd('export', 'update', update)

        const tmp = path.resolve(DRIVE, Math.random().toString(36).substring(2, 15));
        mkdirp(path.resolve(tmp));
        mkdirp(path.resolve(tmp, './export'));

        console.error(`ok - tmp: ${tmp}`);

        console.error(`ok - fetching ${process.env.Bucket}/${process.env.StackName}/job/${exp.job_id}/source.geojson.gz`);
        const loc = await get_source(tmp, exp.job_id)
        console.error(`ok - fetched: ${loc}`);

        await convert(tmp, loc, exp, job)
        console.error(`ok - converted`);

        await s3.putObject({
            ContentType: 'application/zip',
            Bucket: process.env.Bucket,
            Key: `${process.env.StackName}/export/${exp.id}/export.zip`,
            Body: fs.createReadStream(path.resolve(tmp, 'export.zip'))
        }).promise();
        console.error(`ok - uploaded: s3://${process.env.Bucket}/${process.env.StackName}/export/${exp.id}/export.zip`);

        await oa.cmd('export', 'update', {
            ':exportid': process.env.OA_EXPORT_ID,
            size: fs.statSync(path.resolve(tmp, 'export.zip')).size,
            status: 'Success'
        });

        console.error('ok - done');
        await meta.protection(false)
    } catch (err) {
        console.error(err);

        try {
            await oa.cmd('export', 'update', {
                ':exportid': parseInt(process.env.OA_EXPORT_ID),
                status: 'Fail'
            });
        } finally {
            await meta.protection(false)
            process.exit(1);
        }
    }
}

function archive(tmp) {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(path.resolve(tmp, `export.zip`))
            .on('error', (err) => {
                console.error('not ok - ' + err.message);
                return reject(err)
            }).on('close', () => {
                return resolve(path.resolve(tmp, `export.zip`));
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
    let ogr = ogr2ogr(loc)
        .timeout(600000)
        .skipfailures()
        .onStderr((data) => {
            console.error(data);
        })

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
    return new Promise((resolve, reject) => {
        pipeline(
            s3.getObject({
                Bucket: process.env.Bucket,
                Key: `${process.env.StackName}/job/${jobid}/source.geojson.gz`
            }).createReadStream(),
            Unzip(),
            fs.createWriteStream(path.resolve(tmp, 'source.geojson')),
            (err) => {
                if (err) return reject(err);

                return resolve(path.resolve(tmp, 'source.geojson'));
            }
        );
    });
}
