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

    fetch(cb) {
        request({
            url: this.url,
            json: true,
            method: 'GET'
        }, (err, res) => {
            if (err) return cb(err);

            this.source = res.body;

            return cb(null, this.source);
        });
    }

}

module.exports = {
    Job
}
