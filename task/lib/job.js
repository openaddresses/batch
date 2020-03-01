const os = require('os');
const fs = require('fs');
const path = require('path');
const request = require('request');

class Job {
    constructor(job, url, layer, name) {
        if (!job) throw new Error('No OA_JOB env var defined');
        if (!url) throw new Error('No OA_SOURCE env var defined');
        if (!layer) throw new Error('No OA_SOURCE_LAYER env var defined');
        if (!name) throw new Error('No OA_SOURCE_LAYER_NAME env var defined');

        this.tmp = path.resolve(os.tmpdir(), Math.random().toString(36).substring(2, 15));

        fs.mkdirSync(this.tmp);

        this.job = job;
        this.url = url;
        this.source = false;
        this.layer = layer;
        this.name = name;
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

    upload() {

    }

    success(api) {
        return new Promise((resolve, reject) => {
            request({
                url: `${api}/api/job/${this.job}`,
                json: true,
                method: 'PATCH',
                body: JSON.stringify({
                    status: 'Success',
                    output: 's3://openaddresses/data.zip'
                })
            }
        });
    }
}

module.exports = Job;
