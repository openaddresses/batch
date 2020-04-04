#!/usr/bin/env node

'use strict';

const config = require('./package.json');
const dke = require('@mapbox/decrypt-kms-env');
const Job = require('./lib/job');
const path = require('path');
const CP = require('child_process');
const fs = require('fs');
const AWS = require('aws-sdk');

if (!process.env.AWS_DEFAULT_REGION) {
    process.env.AWS_DEFAULT_REGION = 'us-east-1';
}

const batch = new AWS.Batch({
    region: process.env.AWS_DEFAULT_REGION
});

if (require.main === module) {
    if (!process.env.StackName) process.env.StackName = 'local';
    if (!process.env.Bucket) process.env.Bucket = 'v2.openaddreses.io';

    if (!process.env.OA_JOB) throw new Error('No OA_JOB env var defined');
    if (!process.env.OA_SOURCE) throw new Error('No OA_SOURCE env var defined');
    if (!process.env.OA_SOURCE_LAYER) throw new Error('No OA_SOURCE_LAYER env var defined');
    if (!process.env.OA_SOURCE_LAYER_NAME) throw new Error('No OA_SOURCE_LAYER_NAME env var defined');

    if (!process.env.OA_API) throw new Error('No OA_API env var defined');

    const api = process.env.OA_API;

    const job = new Job(
        process.env.OA_JOB,
        process.env.OA_SOURCE,
        process.env.OA_SOURCE_LAYER,
        process.env.OA_SOURCE_LAYER_NAME
    );

    dke(process.env, (err) => {
        if (err) throw err;

        flow(api, job).catch((err) => {
            throw err;
        });
    });
}

async function flow(api, job) {
    try {
        const update = {
            status: 'Pending',
            version: config.version,
            output: job.assets
        };

        if (process.env.AWS_BATCH_JOB_ID) {
            update.loglink = await log_link();
        }

        await job.update(api, update);
        await job.fetch();

        const source_path = path.resolve(job.tmp, 'source.json');

        fs.writeFileSync(source_path, JSON.stringify(job.source, null, 4));

        await process_job(job, source_path);

        await job.convert();
        await job.compress();
        await job.upload();
        await job.update(api, {
            status: 'Success',
            output: job.assets
        });

    } catch (err) {
        console.error(err);

        await job.update(api, {
            status: 'Fail'
        });

        throw new Error(err);
    }
}

function log_link() {
    return new Promise((resolve, reject) => {
        // Allow local runs

        link();

        function link() {
            console.error(`ok - getting meta for job: ${process.env.AWS_BATCH_JOB_ID}`);
            batch.describeJobs({
                jobs: [process.env.AWS_BATCH_JOB_ID]
            }, (err, res) => {
                if (err) return reject(err);

                if (
                    !res.jobs[0]
                    || !res.jobs[0].container
                    || !res.jobs[0].container.logStreamName
                ) {
                    setTimeout(() => {
                        return link();
                    }, 10000);
                } else {
                    resolve(res.jobs[0].container.logStreamName);
                }
            });
        }
    });
}


function process_job(job, source_path) {
    return new Promise((resolve, reject) => {
        const task = CP.spawn('openaddr-process-one', [
            source_path,
            job.tmp,
            '--layer', job.layer,
            '--layersource', job.name,
            '--render-preview',
            '--mapbox-key', process.env.MAPBOX_TOKEN,
            '--verbose'
        ],{
            env: process.env
        });

        task.stderr.pipe(process.stderr);
        task.stdout.pipe(process.stdout);

        task.on('error', reject);

        task.on('close', () => {
            job.status = 'processed';

            return resolve(job.tmp);
        });
    });
}

module.exports = {
    Job,
    flow
};
