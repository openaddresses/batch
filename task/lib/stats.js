const fs = require('fs');
const path = require('path');
const {pipeline} = require('stream');
const transform = require('parallel-transform');

class Stats {
    constructor(file) {
        this.file = file;
        this.count = 0;
    }

    calc() {
        return new Promise((resolve, reject) => {
            pipeline(
                fs.createReadStream(path.resolve(this.file)),
                transform(100, (data, cb) => {
                    try {
                        data = JSON.parse(data);
                        this.count++;

                        return cb(null, '');
                    } catch(err) {
                        return reject(err);
                    }
                }),
                fs.createWriteStream('/dev/null'),
                (err) => {
                    if (err) return reject(err);

                    return resolve({
                        count: this.count
                    });
                }
            )
        });
    }

    bounds(feat) {

    }
}
