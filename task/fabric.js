// Does not need to mark instance
// as protected as it runs on a managed queue
import { interactive } from './lib/pre.js';

const DRIVE = '/tmp';

import fs from 'fs';
import fsp from 'fs/promises';
import os from 'os';
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
    string: ['layer'],
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

            // Each layer is submitted as its own Batch job (see api/lib/batch.js)
            // so a slow layer can't eat the other layers' timeout budget. --layer
            // restricts this run to a single layer; with no --layer, all four run
            // in this one process (used for local/manual runs).
            const ALL_LAYERS = ['addresses', 'buildings', 'parcels', 'centerlines'];
            const layers = args.layer ? ALL_LAYERS.filter((l) => l === args.layer) : ALL_LAYERS;
            if (args.layer && layers.length === 0) throw new Error(`unknown --layer: ${args.layer}`);

            const supported = datas.filter((data) => {
                if (!layers.includes(data.layer)) {
                    console.error(`ok - skipping ${JSON.stringify(data)} due to unsupported layer type`);
                    return false;
                }
                return true;
            });

            console.error(`ok - fetching ${supported.length} sources (${DOWNLOAD_CONCURRENCY} concurrent)`);

            // Tippecanoe's -P flag only parallelizes reading input, not the tiling/
            // indexing pass itself - a single tippecanoe process only ever uses one
            // core no matter how big the box is. To actually use the rest of the
            // vCPUs, split each layer's sources across SHARD_COUNT files, tile them
            // as separate tippecanoe processes running concurrently, then merge the
            // resulting tilesets with tile-join.
            //
            // Shards MUST be geographic, not just size-balanced: tile-join has no
            // flag to disable its own tile size/feature cap (confirmed empirically -
            // it rejects --no-feature-limit/--no-tile-size-limit outright as unknown
            // options), so if two shards both have data in the same dense tile (e.g.
            // a city split across shards by pure byte-size balancing), tile-join
            // silently truncates the merged tile to its default cap. In testing, two
            // shards with ~250k features each in the same tile joined down to just
            // ~80k - an 84% loss with no error or warning.
            //
            // Grouping by each source's path prefix (e.g. "us/tx", "mx") and
            // bin-packing whole groups across shards means no two shards ever hold
            // data for the same country/state, so tile-join only ever concatenates
            // disjoint tilesets - its actual intended use case. The prefix doesn't
            // always exactly match a source's real geographic extent, but it
            // eliminates the failure mode that matters: dense city-center clusters,
            // which live within a single source's prefix. Remaining cross-shard
            // overlap is limited to sparse, low-density cross-border slivers.
            const SHARD_COUNT = os.cpus().length;

            function assignShards(sources) {
                const groups = new Map();
                for (const data of sources) {
                    const key = path.parse(data.source).dir || data.source;
                    if (!groups.has(key)) groups.set(key, { size: 0, jobs: [] });
                    const group = groups.get(key);
                    group.size += data.size || 0;
                    group.jobs.push(data.job);
                }

                // Greedily bin-pack groups (largest first) onto whichever shard
                // currently has the least total size. Every assignment bumps the
                // chosen shard's tracked size by at least 1 so groups with unknown
                // (null) size still round-robin instead of piling onto shard 0.
                const sorted = [...groups.values()].sort((a, b) => b.size - a.size);
                const shardSizes = new Array(SHARD_COUNT).fill(0);
                const jobShard = new Map();
                for (const group of sorted) {
                    let idx = 0;
                    for (let i = 1; i < shardSizes.length; i++) {
                        if (shardSizes[i] < shardSizes[idx]) idx = i;
                    }
                    shardSizes[idx] += Math.max(group.size, 1);
                    for (const job of group.jobs) jobShard.set(job, idx);
                }
                return jobShard;
            }

            const jobShard = new Map();
            for (const l of layers) {
                for (const [job, shard] of assignShards(supported.filter((data) => data.layer === l))) {
                    jobShard.set(job, shard);
                }
            }

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
                        const shard = jobShard.get(data.job);
                        await pipeline(
                            fs.createReadStream(tmp),
                            fs.createWriteStream(path.resolve(DRIVE, `${data.layer}.shard${shard}.geojson`), { flags: 'a' })
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
                const shardInputs = [];
                for (let i = 0; i < SHARD_COUNT; i++) {
                    const shardInput = path.resolve(DRIVE, `${l}.shard${i}.geojson`);
                    if (fs.existsSync(shardInput)) shardInputs.push({ index: i, file: shardInput });
                }

                if (!shardInputs.length) throw new Error(`no sources found for layer ${l}`);

                console.error(`ok - generating ${l} tiles (${shardInputs.length} shard${shardInputs.length === 1 ? '' : 's'})`);

                const tileOptions = {
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
                        max: 14,
                        min: zooms[l]
                    }
                };

                // Tile each shard concurrently - this is what actually uses the
                // box's other vCPUs, since a single tippecanoe process can't.
                await Promise.all(shardInputs.map(({ index, file }) =>
                    tippecanoe.tile(
                        fs.createReadStream(file),
                        path.resolve(DRIVE, `${l}.shard${index}.pmtiles`),
                        tileOptions
                    )
                ));

                const shardOutputs = shardInputs.map(({ index }) => path.resolve(DRIVE, `${l}.shard${index}.pmtiles`));

                if (shardOutputs.length === 1) {
                    await fsp.rename(shardOutputs[0], path.resolve(DRIVE, `${l}.pmtiles`));
                } else {
                    console.error(`ok - joining ${shardOutputs.length} ${l} shards`);
                    await tippecanoe.join(
                        path.resolve(DRIVE, `${l}.pmtiles`),
                        shardOutputs,
                        { force: true, std: true }
                    );
                    await Promise.all(shardOutputs.map((p) => fsp.unlink(p)));
                }

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

                await Promise.all(shardInputs.map(({ file }) => fsp.unlink(file)));
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
