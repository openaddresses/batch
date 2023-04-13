#!/usr/bin/env node
import { interactive } from './lib/pre.js';

import Job from './lib/job.js';
import path from 'path';
import CP from 'child_process';
import fs from 'fs';
import Meta from './lib/meta.js';
import minimist from 'minimist';

const config = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url)));

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
        message: 'OA Job ID',
        name: 'OA_JOB_ID'
    }]);

    return cli();
}

async function cli() {
    if (!process.env.StackName) process.env.StackName = 'local';
    if (!process.env.Bucket) process.env.Bucket = 'v2.openaddreses.io';
    if (!process.env.R2Bucket) process.env.R2Bucket = 'openaddreses';

    if (!process.env.SharedSecret) throw new Error('No SharedSecret env var defined');
    if (!process.env.OA_JOB_ID) throw new Error('No OA_JOB_ID env var defined');

    if (!process.env.OA_API) throw new Error('No OA_API env var defined');

    const OA = (await import('@openaddresses/lib')).default;
    const oa = new OA({
        url: process.env.OA_API,
        secret: process.env.SharedSecret
    });

    const job = new Job(oa, process.env.OA_JOB_ID);

    flow(job).catch((err) => {
        console.error(err);
        process.exit(1);
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
        await job.validate();
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

        try {
            // stats can fail if "Job does not match a live job"
            await job.check_stats(run, await job.compare());
        } catch (err) {
            console.error(err);
        }

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

export {
    Job,
    flow
};
