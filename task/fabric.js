#!/usr/bin/env node

'use strict';

// Does not need to mark instance
// as protected as it runs on a managed queue
require('./lib/pre');

const DRIVE = '/tmp';

const fs = require('fs');
const {pipeline} = require('stream');
const path = require('path');
const prompts = require('prompts');
const Tippecanoe = require('./lib/tippecanoe');
const AWS = require('aws-sdk');
const Meta = require('./lib/meta');
const {Unzip} = require('zlib');
const OA = require('lib-oa');

const s3 = new AWS.S3({
    region: process.env.AWS_DEFAULT_REGION
});

const args = require('minimist')(process.argv, {
    boolean: ['interactive'],
    alias: {
        interactive: 'i'
    }
});

if (require.main === module) {
    if (args.interactive) return prompt()
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
    if (!process.env.OA_API) throw new Error('No OA_API env var defined');

    const meta = new Meta();

    const oa = new OA({
        url: process.env.OA_API,
        secret: process.env.SharedSecret
    }); 

    try {
        await meta.load();
        await meta.protection(true);

        const tippecanoe = new Tippecanoe();

        const datas = await oa.cmd('data', 'list', {
            fabric: true
        });

        const layers = {};
        for (const l of ['addresses', 'buildings', 'parcels']) {
            layers[l] = fs.createWriteStream(path.resolve(DRIVE, `${l}.geojson`), { autoClose: false });
        }

        console.error(`ok - fetching ${datas.length} sources`);
        for (const data of datas) {
            if (!layers[data.layer]) return; // Ignore unsupported sources
            await get_source(layers[data.layer], data);
        }

        const tiles = path.resolve(DRIVE, 'fabric.mbtiles');
        for (const l of Object.keys(layers)) {
            layers[l].close();

            await tippecanoe.tile(
                fs.createReadStream(path.resolve(DRIVE, `${l}.geojson`)),
                tiles,
                {
                    layer: l
                }
            );
        }

    } catch (err) {
        await meta.protection(false);
        console.error(err);
        process.exit();
    }
}

function get_source(out, data) {
    return new Promise((resolve, reject) => {
        const dir = path.parse(data.source).dir;
        const source = `${path.parse(data.source).name}-${data.layer}-${data.name}.geojson`;

        console.error(`ok - fetching ${process.env.Bucket}/${process.env.StackName}/job/${data.job}/source.geojson.gz`);
        pipeline(
            s3.getObject({
                Bucket: process.env.Bucket,
                Key: `${process.env.StackName}/job/${data.job}/source.geojson.gz`
            }).createReadStream(),
            Unzip(),
            out,
            (err) => {
                if (err) {
                    console.error(err);
                    return reject(err);
                }

                return resolve();
            }
        );
    });
}
