'use strict';

const fs = require('fs');
const path = require('path');
const split = require('split');
const turf = require('@turf/turf');
const { pipeline } = require('stream');
const transform = require('parallel-transform');

class Stats {
    constructor(file) {
        if (!file || typeof file !== 'string') throw new Error('Stats.file must be a string');

        this.file = file;
        this.stats = {
            count: 0,
            bounds: []
        };
    }

    calc() {
        return new Promise((resolve, reject) => {
            pipeline(
                fs.createReadStream(path.resolve(this.file)),
                split(),
                transform(100, (data, cb) => {
                    if (!data.trim().length) return cb(null, '');

                    try {
                        const feat = JSON.parse(data);
                        this.stats.count++;

                        this.bounds(feat);

                        return cb(null, '');
                    } catch (err) {
                        return reject(err);
                    }
                }),
                fs.createWriteStream('/dev/null'),
                (err) => {
                    if (err) return reject(err);

                    return resolve(this.stats);
                }
            );
        });
    }

    bounds(feat) {
        const bounds = turf.bbox(feat);

        if (!this.stats.bounds.length) {
            this.stats.bounds = bounds;
            return;
        }

        if (bounds[0] < this.stats.bounds[0]) {
            bounds[0] = this.stats.bounds[0];
        }

        if (bounds[1] < this.stats.bounds[1]) {
            bounds[1] = this.stats.bounds[1];
        }

        if (bounds[2] > this.stats.bounds[2]) {
            bounds[2] = this.stats.bounds[2];
        }

        if (bounds[3] > this.stats.bounds[3]) {
            bounds[2] = this.stats.bounds[3];
        }
    }
}

module.exports = Stats;
