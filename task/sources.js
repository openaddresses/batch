#!/usr/bin/env node

'use strict';

const os = require('os');
const fs = require('fs');
const glob = require('glob');
const path = require('path');
const request = require('request');
const {pipeline} = require('stream');
const unzipper = require('unzipper');

if (!process.env.AWS_DEFAULT_REGION) {
    process.env.AWS_DEFAULT_REGION = 'us-east-1';
}

if (require.main == module) {
    if (!process.env.OA_API) throw new Error('No OA_API env var defined');
    if (!process.env.OA_BRANCH) throw new Error('No OA_BRANCH env var defined');
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
    const list = await sources(tmp)
}

async function fetch(tmp) {
    return new Promise((resolve, reject) => {
        pipeline(
            request(`https://github.com/openaddresses/openaddresses/archive/${process.env.OA_BRANCH}.zip`),
            fs.createWriteStream(path.resolve(tmp, 'openaddresses.zip')),
            (err) => {
                if (err) return reject(err);
                console.error('ok - downloaded repo');

                pipeline(
                    fs.createReadStream(path.resolve(tmp, 'openaddresses.zip')),
                    unzipper.Extract({
                        path: path.resolve(tmp, 'openaddresses')
                    }),
                    (err) => {
                        if (err) return reject(err);
                        return resolve(true);
                    }
                );
            }
        );
    });
}

async function sources(tmp) {
    const dir = fs.readdirSync(path.resolve(tmp, `openaddresses`))[0];
    console.error(dir)
    const globs = glob.sync(`**/*.json`, {
        nodir: true,
        cwd: path.resolve(tmp, `openaddresses`, dir, 'sources')
    });

    const jobs = [];
    for (const glob of globs) {
        const source = JSON.parse(fs.readFileSync(path.resolve(tmp, `openaddresses`, dir, 'sources', glob)))
        if (source.schema !== 2) continue;

        for (const layer of Object.keys(source.layers)) {
            for (const name of source.layers[layer]) {
                jobs.push({
                    source: `https://github.com/openaddresses/openaddresses/blob/${process.env.OA_BRANCH}/sources/${glob}`,
                    layer: layer,
                    name: name.name
                });
            }
        }
    }
    console.error(jobs);
}
