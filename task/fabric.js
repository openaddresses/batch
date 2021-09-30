#!/usr/bin/env node

// Does not need to mark instance
// as protected as it runs on a managed queue
require('./lib/pre');

const DRIVE = '/tmp';

const fs = require('fs');
const TileBase = require('tilebase');
const { pipeline } = require('stream');
const path = require('path');
const prompts = require('prompts');
const Tippecanoe = require('./lib/tippecanoe');
const AWS = require('aws-sdk');
const Meta = require('./lib/meta');
const { Unzip } = require('zlib');
const OA = require('lib-oa');

const s3 = new AWS.S3({
    region: process.env.AWS_DEFAULT_REGION
});

const zooms = {
    addresses: 15,
    parcels: 8,
    buildings: 15
};

const args = require('minimist')(process.argv, {
    boolean: ['interactive'],
    string: ['stack', 'bucket', 'api', 'secret'],
    alias: {
        interactive: 'i'
    },
    default: {
        stack: 'local',
        bucket: 'v2.openaddresses.io',
        api: 'http://localhost:5000',
        secret: '123'
    }
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
        initial: args.stack
    },{
        type: 'text',
        name: 'Bucket',
        message: 'AWS S3 bucket to push results to',
        initial: args.bucket
    },{
        type: 'text',
        name: 'OA_API',
        message: 'OA API Base URL',
        initial: args.api
    },{
        type: 'text',
        name: 'SharedSecret',
        message: 'OA API SharedSecret',
        initial: args.secret
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

        for (const l of Object.keys(layers)) {
            layers[l].close();

            console.error(`ok - generating ${l} tiles`);
            await tippecanoe.tile(
                fs.createReadStream(path.resolve(DRIVE, `${l}.geojson`)),
                path.resolve(DRIVE, `${l}.mbtiles`),
                {
                    layer: l,
                    std: true,
                    force: true,
                    name: `OpenAddresses ${l} fabric`,
                    attribution: 'OpenAddresses',
                    description: `OpenAddresses ${l} fabric`,
                    limit: {
                        features: false,
                        size: false
                    },
                    zoom: {
                        max: 15,
                        min: zooms[l]
                    }
                }
            );
        }

        await tippecanoe.join(path.resolve(DRIVE, 'fabric.mbtiles'), Object.keys(layers).map((l) => {
            return path.resolve(DRIVE, `${l}.mbtiles`);
        }), {
            std: true,
            force: true,
            limit: {
                features: false,
                size: false
            }
        });

        await TileBase.to_tb(
            path.resolve(DRIVE, 'fabric.mbtiles'),
            path.resolve(DRIVE, 'fabric.tilebase')
        );

        await s3.putObject({
            ContentType: 'application/octet-stream',
            Bucket: process.env.Bucket,
            Key: `${process.env.StackName}/fabric.tilebase`,
            Body: fs.createReadStream(path.resolve(DRIVE, 'fabric.tilebase'))
        }).promise();

    } catch (err) {
        await meta.protection(false);
        console.error(err);
        process.exit();
    }
}

function get_source(out, data) {
    return new Promise((resolve, reject) => {
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
