#!/usr/bin/env node

'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const request = require('request');
const {pipeline} = require('stream');
const unzipper = require('unzipper');

if (!process.env.AWS_DEFAULT_REGION) {
    process.env.AWS_DEFAULT_REGION = 'us-east-1';
}

if (require.main == module) {
    if (!process.env.OA_API) throw new Error('No OA_API env var defined');
    if (!process.env.SharedSecret) throw new Error('No SharedSecret env var defined');
    if (!process.env.StackName) process.env.StackName = 'local';
    if (!process.env.Bucket) process.env.Bucket = 'v2.openaddresses.io';

    const tmp = path.resolve(os.tmpdir(), Math.random().toString(36).substring(2, 15));
    console.error(`ok - ${tmp}`);
    fs.mkdirSync(tmp);


    try {
        run(tmp);
    } catch (err) {
        throw new Error(err);
    }
}

async function run(tmp) {
    await fetch(tmp);
    const list = await list(tmp)
}

async function fetch(tmp) {
    return new Promise((resolve, reject) => {
        pipeline(
            request('https://github.com/openaddresses/openaddresses/archive/master.zip'),
            fs.createWriteStream(path.resolve(tmp, 'openaddresses.zip')),
            (err) => {
                if (err) return reject(err);
                console.error('ok - downloaded repo');

                pipeline(
                    fs.createReadStream(path.resolve(tmp, 'openaddresses.zip')),
                    unzipper.Extract({ path: tmp }),
                    (err) => {
                        if (err) return reject(err);
                        return resolve(true);
                    }
                );
            }
        );
    });
}

async function list(tmp) {
}
