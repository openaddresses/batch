// Does not need to mark instance
// as protected as it runs on a managed queue
import { interactive } from './lib/pre.js';

const DRIVE = '/tmp';

import fs from 'fs';
import fsp from 'fs/promises';
import { pipeline } from 'stream/promises';
import path from 'path';
import Tippecanoe from './lib/tippecanoe.js';
import Meta from './lib/meta.js';
import { Unzip } from 'zlib';
import minimist from 'minimist';
import S3 from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

const s3 = new S3.S3Client({ region: process.env.AWS_DEFAULT_REGION });

const r2 = new S3.S3Client({
    region: 'auto',
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    },
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
});

const zooms = {
    addresses: 15,
    parcels: 8,
    buildings: 15
};

const args = minimist(process.argv, {
    boolean: ['interactive', 'fabric', 'border'],
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
    await interactive();

    return cli();
}

async function cli() {
    if (!process.env.SharedSecret) throw new Error('No SharedSecret env var defined');
    if (!process.env.StackName) process.env.StackName = 'local';
    if (!process.env.Bucket) process.env.Bucket = 'v2.openaddresses.io';
    if (!process.env.OA_API) process.env.OA_API = 'https://batch.openaddresses.io/api';

    const OA = (await import('@openaddresses/lib')).default;

    const meta = new Meta();

    const oa = new OA({
        url: process.env.OA_API,
        secret: process.env.SharedSecret
    });

    try {
        await meta.load();

        const tippecanoe = new Tippecanoe();

        if (args.border || (!args.border && !args.fabric)) {
            // Build Borders File
            await pipeline(
                await oa.cmd('map', 'features', {}, {
                    stream: true
                }),
                fs.createWriteStream(path.resolve(DRIVE, 'borders.geojson'))
            );

            console.error('ok - generating border tiles');
            await tippecanoe.tile(
                fs.createReadStream(path.resolve(DRIVE, 'borders.geojson')),
                path.resolve(DRIVE, 'borders.pmtiles'),
                {
                    layer: 'data',
                    std: true,
                    force: true,
                    name: 'OpenAddresses Borders',
                    attribution: 'OpenAddresses',
                    description: 'OpenAddresses Borders',
                    limit: {
                        features: true,
                        size: true
                    },
                    zoom: {
                        max: 6,
                        min: 0
                    }
                }
            );

            const upload = new Upload({
                client: s3,
                params: {
                    ContentType: 'application/octet-stream',
                    Bucket: process.env.Bucket,
                    Key: `${process.env.StackName}/borders.pmtiles`,
                    Body: fs.createReadStream(path.resolve(DRIVE, 'borders.pmtiles'))
                }
            });

            await upload.done();

            const r2BordersUpload = new Upload({
                client: r2,
                params: {
                    ContentType: 'application/octet-stream',
                    Bucket: process.env.R2Bucket,
                    Key: 'v2.openaddresses.io/fabric/borders.pmtiles',
                    Body: fs.createReadStream(path.resolve(DRIVE, 'borders.pmtiles'))
                }
            });

            await r2BordersUpload.done();
            console.error('ok - uploaded borders.pmtiles to R2');

            await fsp.unlink(path.resolve(DRIVE, 'borders.geojson'));
            await fsp.unlink(path.resolve(DRIVE, 'borders.pmtiles'));
        }

        if (args.fabric || (!args.border && !args.fabric)) {
            // Build Data Fabric
            const datas = await oa.cmd('data', 'list');

            const layers = ['addresses', 'buildings', 'parcels'];

            console.error(`ok - fetching ${datas.length} sources`);
            for (const data of datas) {
                if (!layers.includes(data.layer)) {
                    console.error(`ok - skipping ${JSON.stringify(data)} due to unsupported layer type`);
                    continue; // Ignore unsupported sources
                }

                await get_source(data);
            }
            console.error('ok - completed fetch');

            for (const l of layers) {
                console.error(`ok - generating ${l} tiles`);
                await tippecanoe.tile(
                    fs.createReadStream(path.resolve(DRIVE, `${l}.geojson`)),
                    path.resolve(DRIVE, `${l}.pmtiles`),
                    {
                        layer: l,
                        std: true,
                        force: true,
                        drop: true,
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

                // Upload individual layer PMTiles to S3
                const s3Upload = new Upload({
                    client: s3,
                    params: {
                        ContentType: 'application/octet-stream',
                        Bucket: process.env.Bucket,
                        Key: `${process.env.StackName}/fabric/${l}.pmtiles`,
                        Body: fs.createReadStream(path.resolve(DRIVE, `${l}.pmtiles`))
                    }
                });

                await s3Upload.done();

                // Upload individual layer PMTiles to R2
                const r2Upload = new Upload({
                    client: r2,
                    params: {
                        ContentType: 'application/octet-stream',
                        Bucket: process.env.R2Bucket,
                        Key: `v2.openaddresses.io/fabric/${l}.pmtiles`,
                        Body: fs.createReadStream(path.resolve(DRIVE, `${l}.pmtiles`))
                    }
                });

                await r2Upload.done();
                console.error(`ok - uploaded ${l}.pmtiles to S3 and R2`);

                await fsp.unlink(path.resolve(DRIVE, `${l}.geojson`));
                await fsp.unlink(path.resolve(DRIVE, `${l}.pmtiles`));
                console.error(`ok - cleaned up ${l} temp files`);
            }
        }
    } catch (err) {
        try {
            await meta.protection(false);
        } catch (protectionErr) {
            console.error('ok - failed to clear instance protection:', protectionErr.message);
        }
        console.error(err);
        throw err;
    }
}

async function get_source(data) {
    const key = `${process.env.StackName}/job/${data.job}/source.geojson.gz`;
    console.error(`ok - fetching ${process.env.Bucket}/${key}`);

    try {
        await pipeline(
            (await s3.send(new S3.GetObjectCommand({
                Bucket: process.env.Bucket,
                Key: key
            }))).Body,
            new Unzip(),
            fs.createWriteStream(path.resolve(DRIVE, `${data.layer}.geojson`), { flags: 'a' })
        );
    } catch (err) {
        if (err.name === 'NoSuchKey') {
            console.error(`ok - skipping job ${data.job}: source.geojson.gz not found`);
        } else {
            throw err;
        }
    }
}
