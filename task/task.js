#!/usr/bin/env node

'use strict';

require('./lib/pre');

const config = require('./package.json');
const OA = require('lib-oa');
const dke = require('@mapbox/decrypt-kms-env');
const Job = require('./lib/job');
const path = require('path');
const CP = require('child_process');
const fs = require('fs');
const prompts = require('prompts');
const Meta = require('./lib/meta');
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
        message: 'OA Job ID',
        name: 'OA_JOB_ID'
    },{
        type: 'text',
        name: 'StackName',
        message: 'Name of the stack to push to',
        initial: 'local'
    },{
        type: 'text',
        name: 'Bucket',
        message: 'AWS S3 bucket to push results to',
        initial: 'v2.openaddresses.io'
    },{
        type: 'text',
        name: 'OA_API',
        message: 'OA API Base URL',
        initial: 'http://localhost:5000'
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
    if (!process.env.StackName) process.env.StackName = 'local';
    if (!process.env.Bucket) process.env.Bucket = 'v2.openaddreses.io';

    if (!process.env.SharedSecret) throw new Error('No SharedSecret env var defined');
    if (!process.env.OA_JOB_ID) throw new Error('No OA_JOB_ID env var defined');

    if (!process.env.OA_API) throw new Error('No OA_API env var defined');

    const oa = new OA({
        url: process.env.OA_API,
        secret: process.env.SharedSecret
    });

    const job = new Job(oa, process.env.OA_JOB_ID);

    dke(process.env, (err) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }

        flow(job).catch((err) => {
            console.error(err);
            process.exit(1);
        });
    });
}

async function flow(job) {
    let run = false;

    const meta = new Meta();

    try {
        await meta.load();
        await meta.protection(true);

        const update = {
            status: 'Running',
            version: config.version,
            output: job.assets
        };

        if (process.env.AWS_BATCH_JOB_ID) {
            update.loglink = meta.loglink;
        }

        await job.update(update);
        await job.get();
        await job.fetch();
        run = await job.oa.cmd('run', 'get', {
            ':run': job.run
        });

        await job.s3_down();
        await job.check_source();

        await process_job(job);

        await job.convert();
        await job.compress();
        await job.upload();
        await job.update({
            status: 'Success',
            output: job.assets,
            count: job.count,
            bounds: job.bounds,
            stats: job.stats,
            size: job.size
        });

        await job.check_stats(run);
        await meta.protection(false);
    } catch (err) {
        console.error(err);

        try {
            await job.update({
                status: 'Fail'
            });

            console.error(run);
            if (run && run.live) {
                await job.oa.cmd('joberror', 'create', {
                    job: job.job,
                    message: 'machine failed to process source'
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            await meta.protection(false);
            process.exit(1);
        }
    }
}

function process_job(job) {
    return new Promise((resolve, reject) => {
        const source_path = path.resolve(job.tmp, 'source.json');
        fs.writeFileSync(source_path, JSON.stringify(job.source, null, 4));

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
