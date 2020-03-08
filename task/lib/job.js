const os = require('os');
const fs = require('fs');
const path = require('path');
const request = require('request');
const AWS = require('aws-sdk');
const s3 = new AWS.S3({
    region: 'us-east-1'
});

class Job {
    constructor(job, url, layer, name) {
        if (!job) throw new Error('job param required');
        if (!url) throw new Error('url param required');
        if (!layer) throw new Error('layer param required');
        if (!name) throw new Error('name param required');

        this.tmp = path.resolve(os.tmpdir(), Math.random().toString(36).substring(2, 15));

        fs.mkdirSync(this.tmp);

        // pending => processed => uploaded
        this.status = 'pending';

        this.job = job;
        this.url = url;
        this.source = false;
        this.layer = layer;
        this.name = name;

        this.assets = false;
    }

    fetch() {
        return new Promise((resolve, reject) => {
            request({
                url: this.url,
                json: true,
                method: 'GET'
            }, (err, res) => {
                if (err) return reject(err);

                this.source = res.body;

                return resolve(this.source);
            });
        })
    }

    async upload() {
        if (this.status !== 'processed') {
            return new Error('job state must be "processed" to perform asset upload');
        }

        this.assets = `${process.env.StackName}/job/${this.job}/`;

        const processdir = Job.processdir(this.tmp, fs.readdirSync(this.tmp));
        if (!processdir) return reject(new Error('could not determine process_dir'));

        try {
            await s3.putObject({
                Bucket: process.env.Bucket,
                Key: `${this.assets}/job.png`,
                Body: fs.createReadStream(path.resolve(processdir, 'preview.png'))
            }).promise();

        } catch(err) {
            throw new Error(err);
        }

        this.status = 'uploaded';

        return this.assets;
    }

    static processdir(tmp, files) {
        for (const file of files) {
            if (/^process_one/.test(file)) return path.resolve(tmp, file);
        }

        return false;
    }

    update(api, body) {
        return new Promise((resolve, reject) => {
            console.error(`ok - updating: /api/job/${this.job} with ${JSON.stringify(body)}`);

            request({
                url: `${api}/api/job/${this.job}`,
                json: true,
                method: 'PATCH',
                body: body
            }, (err, res) => {
                if (err) return reject(err);

                return resolve(res.body);
            });
        });
    }
}

module.exports = Job;
