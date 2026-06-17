// Does not need to mark instance
// as protected as it runs on a managed queue
import { interactive } from './lib/pre.js';

const DRIVE = '/tmp';

import fs from 'fs';
import fsp from 'fs/promises';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import path from 'path';
import Tippecanoe from './lib/tippecanoe.js';
import Meta from './lib/meta.js';
import { Unzip } from 'zlib';
import split2 from 'split2';
import minimist from 'minimist';
import S3 from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { Agent } from 'https';

// Reuse TCP connections across requests and increase socket pool to match
// download concurrency, significantly reducing per-request overhead.
const keepAliveAgent = new Agent({ keepAlive: true, maxSockets: 500 });
const s3 = new S3.S3Client({
    region: process.env.AWS_DEFAULT_REGION,
    requestHandler: new NodeHttpHandler({ httpsAgent: keepAliveAgent })
});

const r2 = new S3.S3Client({
    region: 'auto',
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    },
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
});

const zooms = {
    addresses: 10,  // address points are only meaningful at street level
    parcels: 8,
    buildings: 10,
    centerlines: 8
};

// Max concurrent S3 downloads. Higher concurrency hides the latency variance
// between small and large sources — a slow 100MB download no longer stalls
// an entire batch of 50. Disk I/O and network (10Gbit on r5.2xlarge) are
// the practical limits, not Node.js event loop.
const DOWNLOAD_CONCURRENCY = 200;

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

            const layers = ['addresses', 'buildings', 'parcels', 'centerlines'];

            const supported = datas.filter((data) => {
                if (!layers.includes(data.layer)) {
                    console.error(`ok - skipping ${JSON.stringify(data)} due to unsupported layer type`);
                    return false;
                }
                return true;
            });

            console.error(`ok - fetching ${supported.length} sources (${DOWNLOAD_CONCURRENCY} concurrent)`);

            // Download each source to its own temp file in parallel (writing
            // concurrent streams to a shared file would interleave bytes and
            // corrupt the newline-delimited GeoJSON). Overlap the concat/delete
            // step with the next chunk's downloads so disk I/O and network
            // don't stall each other. Peak disk usage is ~1x total uncompressed
            // size (temp files are deleted as soon as they're appended).
            let completed = 0;
            let concatPromise = Promise.resolve();

            for (let i = 0; i < supported.length; i += DOWNLOAD_CONCURRENCY) {
                const chunk = supported.slice(i, i + DOWNLOAD_CONCURRENCY);

                // Wait for the previous chunk's concat to finish before starting
                // a new download batch — keeps peak disk usage bounded.
                await concatPromise;
                await Promise.all(chunk.map((data) => get_source(data)));

                concatPromise = (async () => {
                    for (const data of chunk) {
                        const tmp = path.resolve(DRIVE, `${data.layer}.${data.job}.geojson`);
                        if (!fs.existsSync(tmp)) continue;
                        await pipeline(
                            fs.createReadStream(tmp),
                            fs.createWriteStream(path.resolve(DRIVE, `${data.layer}.geojson`), { flags: 'a' })
                        );
                        await fsp.unlink(tmp);
                    }
                    completed += chunk.length;
                    console.error(`ok - fetched ${completed}/${supported.length} sources`);
                })();
            }

            // Wait for the final chunk's concat to complete
            await concatPromise;

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

/**
 * Recursively strip any dimensions beyond 2 (lon/lat) from GeoJSON coordinate arrays
 */
function strip2D(coords) {
    if (!Array.isArray(coords)) return coords;
    if (typeof coords[0] === 'number') return coords.slice(0, 2);
    return coords.map(strip2D);
}

const TRANSIENT_ERRORS = new Set(['ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'aborted']);
const MAX_RETRIES = 3;

async function get_source(data) {
    const key = `${process.env.StackName}/job/${data.job}/source.geojson.gz`;

    // Write to a per-job temp file so parallel downloads don't interleave
    // bytes into the shared layer file
    const tmp = path.resolve(DRIVE, `${data.layer}.${data.job}.geojson`);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        console.error(`ok - fetching ${process.env.Bucket}/${key}${attempt > 1 ? ` (attempt ${attempt})` : ''}`);
        try {
            await pipeline(
                (await s3.send(new S3.GetObjectCommand({
                    Bucket: process.env.Bucket,
                    Key: key
                }))).Body,
                new Unzip(),
                split2(),
                new Transform({
                    readableObjectMode: false,
                    writableObjectMode: true,
                    transform(line, _enc, cb) {
                        // Strip extra dimensions to avoid tippecanoe EPIPE on 3D/4D geometries
                        try {
                            const feat = JSON.parse(line);
                            if (feat.geometry && feat.geometry.coordinates) {
                                feat.geometry.coordinates = strip2D(feat.geometry.coordinates);
                            }
                            cb(null, JSON.stringify(feat) + '\n');
                        } catch {
                            cb(null, line + '\n');
                        }
                    }
                }),
                fs.createWriteStream(tmp)
            );
            return; // success
        } catch (err) {
            if (err.name === 'NoSuchKey') {
                console.error(`ok - skipping job ${data.job}: source.geojson.gz not found`);
                return;
            } else if (TRANSIENT_ERRORS.has(err.code) || TRANSIENT_ERRORS.has(err.message)) {
                if (attempt < MAX_RETRIES) {
                    const delay = attempt * 2000;
                    console.error(`warn - transient error fetching job ${data.job} (${err.code || err.message}), retrying in ${delay}ms...`);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    // Remove partial file before retrying
                    await fsp.unlink(tmp).catch(() => {});
                } else {
                    console.error(`warn - failed to fetch job ${data.job} after ${MAX_RETRIES} attempts (${err.code || err.message}), skipping`);
                }
            } else {
                throw err;
            }
        }
    }
}
