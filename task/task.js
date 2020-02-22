#!/usr/bin/env node

var dke = require('@mapbox/decrypt-kms-env');
const request = require('request');
const CP = require('child_process');
const os = require('os');
const fs = require('fs');

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

    job.fetch((err, source) => {
        fs.writeFileSync(path.resolve(job.tmp, 'source.json'), JSON.stringify(source, null, 4));

        processOne(job);
    });
});

function processOne(job) {
    CP.spawn('openaddr-process-one', [
        '--source', '',
        '--destination', '',
        '--layer', '',
        '--layersource', '',
        '--render-preview',
        '--mapbox-key',
        '--verbose',
    ],{
        env: process.env
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
