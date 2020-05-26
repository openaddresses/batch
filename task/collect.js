#!/usr/bin/env node

'use strict';
const Q = require('d3-queue').queue;
const os = require('os');
const {Unzip} = require('zlib');
const split = require('split');
const transform = require('parallel-transform');
const {pipeline} = require('stream');
const request = require('request');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp').sync;
const AWS = require('aws-sdk');
const archiver = require('archiver');

if (!process.env.AWS_DEFAULT_REGION) {
    process.env.AWS_DEFAULT_REGION = 'us-east-1';
}

if (require.main == module) {
    if (!process.env.OA_API) throw new Error('No OA_API env var defined');
    if (!process.env.StackName) process.env.StackName = 'local';
    if (!process.env.Bucket) process.env.Bucket = 'v2.openaddresses.io';

    try {
        fetch();
    } catch (err) {
        throw new Error(err);
    }
}

const s3 = new AWS.S3({
    region: process.env.AWS_DEFAULT_REGION
});

async function fetch() {
    const tmp = path.resolve(os.tmpdir(), Math.random().toString(36).substring(2, 15));
    fs.mkdirSync(tmp);

    const collections = await fetch_collections();
    const datas = await fetch_datas();

    const q = new Q();

    const stats = {
        count: 0,
        sources: datas.length
    };

    return new Promise((resolve, reject) => {
        for (const data of datas) {
            q.defer((data, done) => {
                const dir = path.parse(data.source).dir;
                const source = `${path.parse(data.source).name}-${data.layer}-${data.name}.geojson`;

                mkdirp(path.resolve(tmp, 'sources', dir));

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
                        if (!err) {
                            console.error('ok - ' + path.resolve(tmp, 'sources',  dir, source));
                        } else {
                            console.error('not ok - ' + path.resolve(tmp, 'sources', dir, source));
                        }

                        return done(err);
                    }

                );
            }, data);
        }

        q.awaitAll(async (err) => {
            if (err) return reject(err);

            console.error('ok - all sources fetched');
            try {
                const zip = await zip_datas(tmp);

                console.error('ok - global archive created');
                await upload_collection(zip);

                console.error('ok - global archive uploaded');
            } catch (err) {
                return reject(err);
            }
        });
    });
}

function upload_collection(file) {
    return new Promise((resolve, reject) => {
        s3.putObject({
            Body: fs.createReadStream(file),
            Bucket: process.env.Bucket,
            Key: `${process.env.StackName}/collection-global.zip`
        }, (err) => {
            if (err) return reject(err);

            return resolve(true);
        });
    });
}

function zip_datas(tmp) {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(path.resolve(tmp, 'global.zip'))
            .on('error', (err) => {
                console.error('not ok - ' + err.message);
                return reject(err)
            }).on('close', () => {
                return resolve(path.resolve(tmp, 'global.zip'));
            });

        const archive = archiver('zip', {
            zlib: { level: 9 }
        }).on('warning', (err) => {
            console.error('not ok - WARN: ' + err);
        }).on('error', (err) => {
            console.error('not ok - ' + err.message);
            return reject(err)
        });

        archive.pipe(output);

        archive.directory(tmp + '/sources/', false);

        archive.finalize();
    });
}

function fetch_collections() {
    return new Promise((resolve, reject) => {
        request({
            url: `${process.env.OA_API}/api/collections`,
            json: true,
            method: 'GET'
        }, (err, res) => {
            if (err) return reject(err);

            return resolve(res.body);
        });
    });
}

function fetch_datas() {
    return new Promise((resolve, reject) => {
        request({
            url: `${process.env.OA_API}/api/data`,
            json: true,
            method: 'GET',
            headers: {
                'shared-secret': process.env.SharedSecret
            }
        }, (err, res) => {
            if (err) return reject(err);

            return resolve(res.body);
        });
    });
}
