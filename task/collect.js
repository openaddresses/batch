// Does not need to mark instance
// as protected as it runs on a managed queue
import { interactive } from './lib/pre.js';
import { PromisePool } from '@supercharge/promise-pool';

import { globSync } from 'glob';
import os from 'node:os';
import { Unzip } from 'zlib';
import split from 'split2';
import { pipeline } from 'stream/promises';
import fs from 'node:fs';
import path from 'node:path';
import { mkdirp } from 'mkdirp';
import S3 from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import archiver from 'archiver';
import minimist from 'minimist';
import readline from 'node:readline';
import { Readable, Transform } from 'node:stream';
import { loadBoundaries } from './lib/boundaries.js';
import { isValidFeature } from './lib/valid-feature.js';
import { countCoordinate, buildTiles, assignTiles, DEFAULT_CELL_DEG } from './lib/tiling.js';
import { openShardWriters, readShard, cleanupShard } from './lib/shard-store.js';
import { buildShardFeatures } from './lib/process-shard.js';

const s3 = new S3.S3Client({
    region: process.env.AWS_DEFAULT_REGION
});

const DRIVE = '/tmp';

const args = minimist(process.argv, {
    boolean: ['interactive'],
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
    cli();

}

async function cli() {
    if (!process.env.StackName) process.env.StackName = 'batch-prod';
    if (!process.env.Bucket) process.env.Bucket = 'v2.openaddresses.io';
    if (!process.env.SharedSecret) throw new Error('No SharedSecret env var defined');
    if (!process.env.OA_API) throw new Error('No OA_API env var defined');

    let tmp = path.resolve(os.tmpdir(), Math.random().toString(36).substring(2, 15));

    const OA = (await import('@openaddresses/lib')).default;

    const oa = new OA({
        url: process.env.OA_API,
        secret: process.env.SharedSecret
    });

    try {
        fs.statSync(DRIVE);

        tmp = path.resolve(DRIVE, Math.random().toString(36).substring(2, 15));
    } catch (err) {
        console.error(`ok - could not find ${DRIVE}: ${err}`);
    }

    fs.mkdirSync(tmp);
    console.error(`ok - TMP: ${tmp}`);

    try {
        const collections = await oa.cmd('collection', 'list');
        console.error('ok - got collections list');
        const datas = await oa.cmd('data', 'list');
        console.error('ok - got data list');

        await sources(oa, tmp, datas);
        console.error('ok - all sources fetched');

        let boundaries = { region: [], district: [] };
        try {
            // oa.cmd(..., { stream: true }) returns the global fetch()'s
            // res.body - a WHATWG ReadableStream, not a Node Readable.
            // readline (inside loadBoundaries) requires a Node stream.
            boundaries = await loadBoundaries(Readable.fromWeb(await oa.cmd('map', 'features', {}, { stream: true })));
            console.error(`ok - loaded ${boundaries.region.length} region and ${boundaries.district.length} district boundaries`);
        } catch (err) {
            console.error(`not ok - failed to load map boundaries, region/district backfill will be skipped: ${err.message}`);
        }

        for (const collection of collections) {
            console.error(`# ${collection.name}`);
            await collect(tmp, collection, oa, boundaries);
        }
    } catch (err) {
        console.error(err);
        throw err;
    }
}

async function collect(tmp, collection, oa, boundaries) {
    let collection_data = [];

    for (const source of collection.sources) {
        collection_data = collection_data.concat(globSync(source, {
            nodir: true,
            cwd: path.resolve(tmp, 'sources')
        }));
    }

    collection_data = collection_data.filter((d) => {
        return path.parse(d).ext === '.geojson';
    });

    const zip = await zip_datas(tmp, collection_data, collection.name);

    console.error(`ok - zip created: ${zip}`);
    const zipSize = fs.statSync(zip).size;
    await upload_zip_collection(zip, collection.name);
    console.error('ok - archive uploaded');
    fs.unlinkSync(zip);
    console.error(`ok - deleted ${zip}`);

    await oa.cmd('collection', 'update', {
        ':collection': collection.id,
        size: zipSize
    });

    try {
        const processedSize = await process_collection(tmp, collection, collection_data, boundaries);

        if (processedSize === null) return;

        await oa.cmd('collection', 'update', {
            ':collection': collection.id,
            processed_size: processedSize
        });
        console.error('ok - processed archive uploaded');
    } catch (err) {
        console.error(`not ok - failed to build processed collection for ${collection.name}: ${err.message}`);
    }
}

// See docs/superpowers/specs/2026-09-07-sharded-processed-collections-design.md.
// process_collection() below shards a collection geographically instead of
// holding it all in memory at once - matches between records only ever
// happen within a ~22m radius (dedupe.js's 3x3 grid-cell neighborhood), so
// each tile can be deduped/backfilled independently. This is the per-tile
// cap the quadtree in buildTiles() splits down to: a shard this size costs
// roughly 1.5GB resident (Feature object, properties, geometry, and
// dedupe's own working structures per record - see the sizing note this
// replaced, preserved in git history), leaving wide headroom under the
// 10000MB heap (api/lib/batch.js) regardless of how many tiles a
// collection produces. No collection is skipped by size alone anymore -
// see the per-shard safety valve in process_collection() for the one
// remaining size-based skip, scoped to a single pathological tile.
export const SHARD_FEATURE_BUDGET = 1000000;

/**
 * Read one source's line-delimited GeoJSON into an array of features.
 *
 * Streamed line-by-line (rather than readFileSync().split('\n')) so a
 * single >512MB source file can't blow the V8 max string length, and so
 * the raw file text never has to be resident alongside the parsed objects.
 */
export async function readSourceFeatures(file, relPath) {
    const features = [];

    const input = fs.createReadStream(file);
    const rl = readline.createInterface({
        input,
        crlfDelay: Infinity
    });

    try {
        for await (const line of rl) {
            if (!line.trim()) continue;

            try {
                features.push(JSON.parse(line));
            } catch (err) {
                console.error(`not ok - skipping malformed feature in ${relPath}: ${err.message}`);
                continue;
            }
        }
    } finally {
        rl.close();
        input.destroy();
    }

    return features;
}

/**
 * Stream one source's features purely to bucket their coordinates into the
 * density counts map - never retains a features array, so this pass costs
 * O(1) memory per source regardless of collection size. Malformed lines are
 * silently skipped here; they are already logged when readSourceFeatures
 * reads the same file for real during the assign pass below.
 */
async function countSourceFeatures(file, counts) {
    const input = fs.createReadStream(file);
    const rl = readline.createInterface({ input, crlfDelay: Infinity });

    try {
        for await (const line of rl) {
            if (!line.trim()) continue;

            let feature;
            try {
                feature = JSON.parse(line);
            } catch {
                continue;
            }

            if (!isValidFeature(feature)) continue;
            const [lon, lat] = feature.geometry.coordinates;
            countCoordinate(counts, lon, lat, DEFAULT_CELL_DEG);
        }
    } finally {
        rl.close();
        input.destroy();
    }
}

/**
 * Write features to a stream honouring backpressure - firing write() in a
 * tight loop buffers the entire output in memory when the disk can't keep
 * up, which is exactly the memory we're trying not to spend here.
 */
export async function writeFeatures(out, features) {
    for (const feature of features) {
        if (out.write(JSON.stringify(feature) + '\n')) continue;

        await new Promise((resolve, reject) => {
            function onDrain() {
                out.removeListener('error', onError);
                resolve();
            }

            function onError(err) {
                out.removeListener('drain', onDrain);
                reject(err);
            }

            out.once('drain', onDrain);
            out.once('error', onError);
        });
    }
}

/**
 * Build the deduped/backfilled processed dataset for one collection by
 * sharding it geographically instead of holding every feature in memory
 * at once: count each source's feature density, partition the populated
 * area into tiles bounded by SHARD_FEATURE_BUDGET, assign every feature to
 * its home tile (plus any neighboring tile it should be borrowed into for
 * boundary matching), then dedupe/backfill and concatenate one tile at a
 * time. See docs/superpowers/specs/2026-09-07-sharded-processed-collections-design.md.
 */
async function process_collection(tmp, collection, collection_data, boundaries) {
    const counts = new Map();
    for (const relPath of collection_data) {
        await countSourceFeatures(path.resolve(tmp, 'sources', relPath), counts);
    }

    const { tiles, cellToTile } = buildTiles(counts, { budget: SHARD_FEATURE_BUDGET, cellDeg: DEFAULT_CELL_DEG });

    if (tiles.length === 0) {
        console.error(`not ok - skipping processed build for ${collection.name}: no valid features found`);
        return null;
    }

    const writers = openShardWriters(tmp, tiles.length);
    for (const relPath of collection_data) {
        const features = await readSourceFeatures(path.resolve(tmp, 'sources', relPath), relPath);
        for (const feature of features) {
            if (!isValidFeature(feature)) continue;
            const [lon, lat] = feature.geometry.coordinates;
            const { home, borrowed } = assignTiles(cellToTile, DEFAULT_CELL_DEG, lon, lat);
            if (home === undefined) continue;

            writers.writeCore(home, relPath, feature);
            for (const tileIdx of borrowed) writers.writeBorrowed(tileIdx, relPath, feature);
        }
    }
    await writers.closeAll();

    const geojsonPath = path.resolve(tmp, `${collection.name}-processed.geojson`);
    const out = fs.createWriteStream(geojsonPath);

    for (let idx = 0; idx < tiles.length; idx++) {
        const { core, borrowed } = await readShard(tmp, idx);
        const coreCount = [...core.values()].reduce((sum, f) => sum + f.length, 0);
        const borrowedCount = [...borrowed.values()].reduce((sum, f) => sum + f.length, 0);

        if (coreCount + borrowedCount > SHARD_FEATURE_BUDGET) {
            console.error(`not ok - skipping shard ${idx} (bbox ${tiles[idx].bbox.join(',')}) for ${collection.name}: ${coreCount + borrowedCount}+ features exceeds the ${SHARD_FEATURE_BUDGET}-feature per-shard budget`);
            cleanupShard(tmp, idx);
            continue;
        }

        const features = buildShardFeatures(core, borrowed, boundaries);
        await writeFeatures(out, features);
        cleanupShard(tmp, idx);
    }

    await new Promise((resolve, reject) => {
        out.end((err) => {
            if (err) return reject(err);
            return resolve();
        });
    });

    const zip = await zip_processed(tmp, geojsonPath, collection.name);
    const zipSize = fs.statSync(zip).size;
    await upload_zip_processed(zip, collection.name);
    fs.unlinkSync(zip);
    fs.unlinkSync(geojsonPath);

    return zipSize;
}

async function sources(oa, tmp, datas) {
    datas = datas.filter((data) => {
        if (!data.output.output) {
            console.error(`ok - skipping ${JSON.stringify(data)} - no successful output to fetch`);
            return false;
        }
        return true;
    });

    const stats = {
        count: 0,
        sources: datas.length
    };

    await PromisePool
        .for(datas)
        .withConcurrency(50)
        .process(async (data) => {
            let attempt = 0;
            let error = false;
            let done = false;

            do {
                try {
                    ++attempt;
                    done = await get_source(oa, tmp, data, stats);
                } catch (err) {
                    if (err.name === 'NoSuchKey') {
                        console.error(`ok - skipping job ${data.job}: source.geojson.gz not found`);
                        done = true;
                        break;
                    }
                    console.error(`Attempt ${attempt}: ${err}`);
                    error = err;
                }

                console.error(done);
            } while (!done && attempt < 5);
            if (!done && error) throw error;

            return done;
        });

    return stats;
}

// Hard cap on a single source fetch. Without this, a stalled S3 connection
// (no data, no error) blocks its PromisePool slot forever and the job never
// finishes or times out - it just silently burns compute until manually killed.
const GET_SOURCE_TIMEOUT_MS = 5 * 60 * 1000;

async function get_source(oa, tmp, data, stats) {
    const dir = path.parse(data.source).dir;
    const source = `${path.parse(data.source).name}-${data.layer}-${data.name}.geojson`;
    const source_meta = `${path.parse(data.source).name}-${data.layer}-${data.name}.geojson.meta`;

    await mkdirp(path.resolve(tmp, 'sources', dir));

    const job = await oa.cmd('job', 'get', {
        ':job': data.job
    });

    fs.writeFileSync(path.resolve(tmp, 'sources', dir, source_meta), JSON.stringify(job, null, 4));

    console.error(`ok - fetching ${process.env.Bucket}/${process.env.StackName}/job/${data.job}/source.geojson.gz`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error('get_source timed out')), GET_SOURCE_TIMEOUT_MS);

    try {
        await pipeline(
            (await s3.send(new S3.GetObjectCommand({
                Bucket: process.env.Bucket,
                Key: `${process.env.StackName}/job/${data.job}/source.geojson.gz`
            }), { abortSignal: controller.signal })).Body,
            new Unzip(),
            split(),
            new Transform({
                objectMode: true,
                transform: (line, _, cb) => {
                    if (!line || !line.trim()) return cb(null, '');
                    stats.count++; return cb(null, line + '\n');
                }
            }),
            fs.createWriteStream(path.resolve(tmp, 'sources', dir, source))
        );
    } catch (err) {
        console.error(err);
        console.error('not ok - ' + path.resolve(tmp, 'sources', dir, source));
        throw err;
    } finally {
        clearTimeout(timeout);
    }

    console.error('ok - ' + path.resolve(tmp, 'sources',  dir, source));

    return path.resolve(tmp, 'sources',  dir, source);
}

async function upload_zip_collection(file, name) {
    const s3uploader = new Upload({
        client: s3,
        partSize: 100 * 1024 * 1024,
        params: {
            ContentType: 'application/zip',
            Body: fs.createReadStream(file),
            Bucket: process.env.Bucket,
            Key: `${process.env.StackName}/collection-${name}.zip`
        }
    });

    await s3uploader.done();

    console.error(`ok - s3://${process.env.Bucket}/${process.env.StackName}/collection-${name}.zip`);

    const r2 = new S3.S3Client({
        region: 'auto',
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
        },
        endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
    });

    const r2uploader = new Upload({
        client: r2,
        partSize: 100 * 1024 * 1024,
        params: {
            ContentType: 'application/zip',
            Body: fs.createReadStream(file),
            Bucket: process.env.R2Bucket,
            Key: `v2.openaddresses.io/${process.env.StackName}/collection-${name}.zip`
        }
    });

    await r2uploader.done();

    console.error(`ok - uploaded: r2://${process.env.R2Bucket}/v2.openaddresses.io/${process.env.StackName}/collection-${name}.zip`);
}

function zip_processed(tmp, geojsonPath, name) {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(path.resolve(tmp, `${name}-processed.zip`))
            .on('error', (err) => {
                console.error('not ok - ' + err.message);
                return reject(err);
            }).on('close', () => {
                return resolve(path.resolve(tmp, `${name}-processed.zip`));
            });

        const archive = archiver('zip', {
            zlib: { level: 9 }
        }).on('warning', (err) => {
            console.error('not ok - WARN: ' + err);
        }).on('error', (err) => {
            console.error('not ok - ' + err.message);
            return reject(err);
        });

        archive.pipe(output);
        archive.file(geojsonPath, { name: `${name}.geojson` });
        archive.finalize();
    });
}

async function upload_zip_processed(file, name) {
    const s3uploader = new Upload({
        client: s3,
        partSize: 100 * 1024 * 1024,
        params: {
            ContentType: 'application/zip',
            Body: fs.createReadStream(file),
            Bucket: process.env.Bucket,
            Key: `${process.env.StackName}/collection-${name}-processed.zip`
        }
    });

    await s3uploader.done();

    console.error(`ok - s3://${process.env.Bucket}/${process.env.StackName}/collection-${name}-processed.zip`);

    const r2 = new S3.S3Client({
        region: 'auto',
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
        },
        endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
    });

    const r2uploader = new Upload({
        client: r2,
        partSize: 100 * 1024 * 1024,
        params: {
            ContentType: 'application/zip',
            Body: fs.createReadStream(file),
            Bucket: process.env.R2Bucket,
            Key: `v2.openaddresses.io/${process.env.StackName}/collection-${name}-processed.zip`
        }
    });

    await r2uploader.done();

    console.error(`ok - uploaded: r2://${process.env.R2Bucket}/v2.openaddresses.io/${process.env.StackName}/collection-${name}-processed.zip`);
}

function zip_datas(tmp, datas, name) {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(path.resolve(tmp, `${name}.zip`))
            .on('error', (err) => {
                console.error('not ok - ' + err.message);
                return reject(err);
            }).on('close', () => {
                return resolve(path.resolve(tmp, `${name}.zip`));
            });

        const archive = archiver('zip', {
            zlib: { level: 9 }
        }).on('warning', (err) => {
            console.error('not ok - WARN: ' + err);
        }).on('error', (err) => {
            console.error('not ok - ' + err.message);
            return reject(err);
        });

        archive.pipe(output);

        for (const data of datas) {
            archive.file(path.resolve(tmp, 'sources', data), {
                name: data
            });

            archive.file(path.resolve(tmp, 'sources', data + '.meta'), {
                name: data + '.meta'
            });
        }

        archive.on('finish', () => {
            resolve(path.resolve(tmp, `${name}.zip`));
        });


        archive.finalize();
    });
}
