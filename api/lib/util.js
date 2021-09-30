const request = require('request');
const pkg = require('../package.json');
const Err = require('./error');

class Status {
    static list() {
        return require('../schema/util/status.json').enum;
    }

    static verify(statuses) {
        const list = Status.list();

        for (const status of statuses) {
            if (!list.includes(status)) {
                throw new Err(400, null, 'Invalid status param');
            }
        }
    }
}

class Param {
    static async int(req, name) {
        req.params[name] = Number(req.params[name]);
        if (isNaN(req.params[name])) {
            throw new Err(400, null, `${name} param must be an integer`);
        }
    }
}

function explode(url) {
    return new Promise((resolve, reject) => {
        request({
            url: url,
            headers: {
                'User-Agent': `OpenAddresses v${pkg.version}`
            },
            method: 'GET',
            json: true
        }, (err, res) => {
            if (err) return reject(err);

            const source = res.body;

            const jobs = [];

            if (
                !source.schema
                || source.schema !== 2
            ) {
                return reject(new Error('Job is not schema v2'));
            } else if (!source.layers) {
                return reject(new Error('Job does not have layers array'));
            }

            const layers = Object.keys(source.layers);
            for (const layer of layers) {
                for (const j of source.layers[layer]) {
                    jobs.push({
                        source: url,
                        layer: layer,
                        name: j.name
                    });
                }
            }

            return resolve(jobs);
        });
    });
}

module.exports = {
    explode,
    Param,
    Status
};

