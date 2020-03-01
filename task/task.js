#!/usr/bin/env node

const dke = require('@mapbox/decrypt-kms-env');
const Job = require('./lib/job');
const request = require('request');
const path = require('path');
const CP = require('child_process');
const os = require('os');
const fs = require('fs');

if (require.main === module) {
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

    dke(process.env, (err, scrubbed) => {
        if (err) throw err;

        flow(api, job).catch((err) => {
            throw err;
        });
    });
}

async function flow(api, job, cb) {
    try {
        let source = await job.fetch();

        const source_path = path.resolve(job.tmp, 'source.json');
        fs.writeFileSync(source_path, JSON.stringify(job.source, null, 4));

        await processOne(job, source_path);

        await job.success(api);

    } catch (err) {
        throw err;
    }
}

function processOne(job, source_path) {
    return new Promise((resolve, reject) => {
        const task = CP.spawn('openaddr-process-one', [
            source_path,
            job.tmp,
            '--layer', job.layer,
            '--layersource', job.name,
            '--render-preview',
            '--mapbox-key', process.env.MapboxToken,
            '--verbose',
        ],{
            env: process.env
        });

        task.stderr.pipe(process.stderr);
        task.stdout.pipe(process.stdout);

        task.on('error', reject);

        task.on('close', (exit) => {
            return resolve(job.tmp);
        });
    });
}

module.exports = {
    Job,
    flow
}
