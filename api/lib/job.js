const config = require('../package.json');

class Job {
    constructor(set, url, layer, name) {
        this.id = false,
        this.set = set;
        this.created = false;
        this.url = url;
        this.layer = layer;
        this.name = name;
        this.status = 'Pending';
        this.version = config.version;
    }
}

module.exports = Job;
