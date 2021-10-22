#!/usr/bin/env node

// Does not need to mark instance
// as protected as it runs on a managed queue
require('./lib/pre');

const glob = require('glob');
const OA = require('lib-oa');
const os = require('os');
const { Unzip } = require('zlib');
const split = require('split');
const transform = require('parallel-transform');
const { pipeline } = require('stream');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp').sync;
const AWS = require('aws-sdk');
const archiver = require('archiver');

const DRIVE = '/tmp';

if (require.main === module) {
    if (!process.env.OA_API) throw new Error('No OA_API env var defined');
    if (!process.env.SharedSecret) throw new Error('No SharedSecret env var defined');
    if (!process.env.StackName) process.env.StackName = 'local';
    if (!process.env.Bucket) process.env.Bucket = 'v2.openaddresses.io';

    try {
        fetch();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

const s3 = new AWS.S3({
    region: process.env.AWS_DEFAULT_REGION
});

async function fetch() {
    let tmp = path.resolve(os.tmpdir(), Math.random().toString(36).substring(2, 15));

    const oa = new OA({
        url: process.env.OA_API,
        secret: process.env.SharedSecret
    });

    try {
        fs.stat(DRIVE);

        tmp = path.resolve(DRIVE, Math.random().toString(36).substring(2, 15));
    } catch (err) {
        console.error(`ok - could not find ${DRIVE}`);
    }

    fs.mkdirSync(tmp);
    console.error(`ok - TMP: ${tmp}`);

    try {
        const collections = await oa.cmd('collection', 'list');
        console.error('ok - got collections list');
        const datas = await oa.cmd('data', 'list');
        console.error('ok - got data list');

        await sources(tmp, datas);
        console.error('ok - all sources fetched');

        for (const collection of collections) {
            console.error(`# ${collection.name}`);
            await collect(tmp, collection, oa);
        }
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

async function collect(tmp, collection, oa) {
    let collection_data = [];

    for (const source of collection.sources) {
        collection_data = collection_data.concat(glob.sync(source, {
            nodir: true,
            cwd: path.resolve(tmp, 'sources')
        }));
    }

    const zip = await zip_datas(tmp, collection_data, collection.name);

    console.error(`ok - zip created: ${zip}`);
    await upload_collection(zip, collection.name);
    console.error('ok - archive uploaded');

    await oa.cmd('collection', 'update', {
        ':collection': collection.id,
        size: fs.statSync(zip).size
    });
}

async function sources(tmp, datas) {
    const stats = {
        count: 0,
        sources: datas.length
    };

    try {
        for (const data of datas) {
            await get_source(tmp, data, stats);
        }
    } catch (err) {
        throw new Error(err);
    }

    return stats;
}

function get_source(tmp, data, stats) {
    return new Promise((resolve, reject) => {
        const dir = path.parse(data.source).dir;
        const source = `${path.parse(data.source).name}-${data.layer}-${data.name}.geojson`;
        const source_meta = `${path.parse(data.source).name}-${data.layer}-${data.name}.geojson.meta`;

        mkdirp(path.resolve(tmp, 'sources', dir));

        const job = await oa.cmd('job', 'get', {
            ':job': data.job
        });

        fs.writeFileSync(source_meta, JSON.stringify(job, null, 4));

        console.error(`ok - fetching ${process.env.Bucket}/${process.env.StackName}/job/${data.job}/source.geojson.gz`);
        pipeline(
            s3.getObject({
                Bucket: process.env.Bucket,
                Key: `${process.env.StackName}/job/${data.job}/source.geojson.gz`
            }).createReadStream(),
            Unzip(),
            split(),
            transform(100, (line, cb) => {
                if (!line || !line.trim()) return cb(null, '');

                stats.count++; return cb(null, line + '\n');
            }),
            fs.createWriteStream(path.resolve(tmp, 'sources', dir, source)),
            (err) => {
                if (err) {
                    console.error(err);
                    console.error('not ok - ' + path.resolve(tmp, 'sources', dir, source));
                    return reject(err);
                }

                console.error('ok - ' + path.resolve(tmp, 'sources',  dir, source));
                return resolve();
            }
        );
    });
}

function upload_collection(file, name) {
    return new Promise((resolve, reject) => {
        s3.upload({
            ContentType: 'application/zip',
            Body: fs.createReadStream(file),
            Bucket: process.env.Bucket,
            Key: `${process.env.StackName}/collection-${name}.zip`
        }, (err) => {
            console.error(`ok - s3://${process.env.Bucket}/${process.env.StackName}/collection-${name}.zip`);
            if (err) return reject(err);

            return resolve(true);
        });
    });
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
        }

        archive.on('finish', () => {
            resolve(path.resolve(tmp, `${name}.zip`));
        });


        archive.finalize();
    });
}
