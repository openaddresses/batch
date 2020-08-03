#!/usr/bin/env node

'use strict';

const config = require('./package.json');
const dke = require('@mapbox/decrypt-kms-env');
const Run = require('./lib/run');
const Job = require('./lib/job');
const JobError = require('./lib/joberror');
const path = require('path');
const CP = require('child_process');
const fs = require('fs');
const AWS = require('aws-sdk');
const prompts = require('prompts');
const args = require('minimist')(process.argv, {
    boolean: ['interactive'],
    alias: {
        interactive: 'i'
    }
});

if (!process.env.AWS_DEFAULT_REGION) {
    process.env.AWS_DEFAULT_REGION = 'us-east-1';
}

const batch = new AWS.Batch({
    region: process.env.AWS_DEFAULT_REGION
});

if (require.main === module) {
    if (args.interactive) return prompt();
    return cli();
}

async function prompt() {
    const p = await prompts([{
        type: 'text',
        name: 'StackName',
        message: 'Name of the stack to push to',
        initial: 'local'
    },{
        type: 'text',
        name: 'Bucket',
        message: 'AWS S3 bucket to push results to',
        initial: 'v2.openaddreses.io'
    },{
        type: 'text',
        message: 'OA Job ID',
        name: 'OA_JOB'
    },{
        type: 'text',
        message: 'OA Github Source URL',
        name: 'OA_SOURCE'
    },{
        type: 'text',
        message: 'OA Layer String',
        name: 'OA_SOURCE_LAYER'
    },{
        type: 'text',
        message: 'OA Layer Name',
        name: 'OA_SOURCE_LAYER_NAME'
    },{
        type: 'text',
        name: 'OA_API',
        message: 'OA API Base URL',
        initial: 'http://localhost:5000'
    },{
        type: 'text',
        name: 'SharedSecret',
        message: 'OA API SharedSecret'
    }]);

    Object.assign(process.env, p);

    return cli();
}

async function cli() {
    if (!process.env.StackName) process.env.StackName = 'local';
    if (!process.env.Bucket) process.env.Bucket = 'v2.openaddreses.io';

    if (!process.env.SharedSecret) throw new Error('No SharedSecret env var defined');
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
        if (err) {
            console.error(err);
            process.exit(1);
        }

        flow(api, job).catch((err) => {
            console.error(err);
            process.exit(1);
        });
    });
}

async function flow(api, job) {
    let run = false;

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
        await job.get(api);
        await job.fetch();

        run = await Run.get(api, job.run);

        const source_path = path.resolve(job.tmp, 'source.json');

        fs.writeFileSync(source_path, JSON.stringify(job.source, null, 4));

        await process_job(job, source_path);

        await job.convert();
        await job.compress();
        await job.upload();
        await job.update(api, {
            status: 'Success',
            output: job.assets,
            count: job.count,
            bounds: job.bounds,
            stats: job.stats
        });

        await job.check(api, run);
    } catch (err) {
        console.error(err);

        await job.update(api, {
            status: 'Fail'
        });

        console.error(run)
        if (run && run.live) {
            await JobError.create(api, job.job, 'machine failed to process source');
        }

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
