#!/usr/bin/env node

var dke = require('@mapbox/decrypt-kms-env');
const request = require('request');
const path = require('path');
const CP = require('child_process');
const os = require('os');
const fs = require('fs');

if (require.main === module) {
    if (!process.env.OA_SOURCE) throw new Error('No OA_SOURCE env var defined');
    if (!process.env.OA_SOURCE_LAYER) throw new Error('No OA_SOURCE_LAYER env var defined');
    if (!process.env.OA_SOURCE_LAYER_NAME) throw new Error('No OA_SOURCE_LAYER_NAME env var defined');

    const job = new Job(
        process.env.OA_SOURCE,
        process.env.OA_SOURCE_LAYER,
        process.env.OA_SOURCE_LAYER_NAME
    );

    dke(process.env, (err, scrubbed) => {
        if (err) throw err;

        return flow(job, (err) => {
            if (err) throw err;
        });
    });
}

function flow(job, cb) {
    job.fetch((err, source) => {
        const source_path = path.resolve(job.tmp, 'source.json');
        fs.writeFileSync(source_path, JSON.stringify(job.source, null, 4));

        processOne(job, source_path, cb);
    });
}

function processOne(job, source_path, cb) {
    const source_out = path.resolve(job.tmp, 'source.csv');

    const task = CP.spawn('openaddr-process-one', [
        source_path,
        source_out,
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

    task.on('error', cb);

    task.on('close', (exit) => {
        return cb(null, source_out);
    });
}

class Job {
    constructor(url, layer, name) {
        if (!url) throw new Error('No OA_SOURCE env var defined');
        if (!layer) throw new Error('No OA_SOURCE_LAYER env var defined');
        if (!name) throw new Error('No OA_SOURCE_LAYER_NAME env var defined');

        this.tmp = path.resolve(os.tmpdir(), Math.random().toString(36).substring(2, 15));

        fs.mkdirSync(this.tmp);

        this.url = url;
        this.source = false;
        this.layer = layer;
        this.name = name;

    }

    fetch(cb) {
        request({
            url: this.url,
            method: 'GET'
        }, (err, source) => {
            if (err) return cb(err);

            this.source = source;

            return cb(null, source);
        });
    }

}

module.exports = {
    Job,
    flow
}
