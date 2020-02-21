#!/usr/bin/env node

const request = require('request');

const job = {
    source: process.env.OA_SOURCE,
    layer: process.env.OA_SOURCE_LAYER,
    name: process.env.OA_SOURCE_LAYER_NAME
}

console.error(job);

if (!job.source) throw new Error('No OA_SOURCE env var defined');
if (!job.layer) throw new Error('No OA_SOURCE_LAYER env var defined');
if (!job.name) throw new Error('No OA_SOURCE_LAYER_NAME env var defined');

function fetch(job) {
    request({
        url: job.source,
        method: 'GET'
    }, (err, source) => {
        if (err) throw err;

        console.error(source);
    });
}
