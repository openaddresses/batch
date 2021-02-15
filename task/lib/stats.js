'use strict';

const fs = require('fs');
const path = require('path');
const split = require('split');
const turf = require('@turf/turf');
const { pipeline } = require('stream');
const transform = require('parallel-transform');

class Stats {
    constructor(file, layer) {
        if (!file || typeof file !== 'string') throw new Error('Stats.file must be a string');
        if (!layer || typeof layer !== 'string') throw new Error('Stats.layer must be a string');

        this.file = file;
        this.layer = layer;

        this.stats = {
            count: 0,
            bounds: []
        };

        if (this.layer === 'addresses') {
            this.stats.addresses = {
                counts: {
                    unit: 0,
                    number: 0,
                    street: 0,
                    city: 0,
                    district: 0,
                    region: 0,
                    postcode: 0
                }
            };
        } else if (this.layer === 'buildings') {
            this.stats.buildings = {
                counts: {}
            };
        } else if (this.layer === 'parcels') {
            this.stats.parcels = {
                counts: {}
            };
        } else {
            this.stats[this.layer] = {
                counts: {}
            };
        }
    }

    calc() {
        return new Promise((resolve, reject) => {
            pipeline(
                fs.createReadStream(path.resolve(this.file)),
                split(),
                transform(100, (data, cb) => {
                    if (!data.trim().length) return cb(null, '');

                    let feat;
                    try {
                        feat = JSON.parse(data);
                    } catch (err) {
                        return reject(err);
                    }

                    this.stats.count++;

                    this.bounds(feat);

                    if (this.layer === 'addresses') {
                        this.addresses(feat);
                    }

                    return cb(null, '');
                }),
                fs.createWriteStream('/dev/null'),
                (err) => {
                    if (err) return reject(err);

                    return resolve(this.stats);
                }
            );
        });
    }

    addresses(feat) {
        if (feat.properties.unit.trim().length > 0) this.stats.addresses.counts.unit++;
        if (feat.properties.number.trim().length > 0) this.stats.addresses.counts.number++;
        if (feat.properties.street.trim().length > 0) this.stats.addresses.counts.street++;
        if (feat.properties.city.trim().length > 0) this.stats.addresses.counts.city++;
        if (feat.properties.district.trim().length > 0) this.stats.addresses.counts.district++;
        if (feat.properties.region.trim().length > 0) this.stats.addresses.counts.region++;
        if (feat.properties.postcode.trim().length > 0) this.stats.addresses.counts.postcode++;
    }

    bounds(feat) {
        const bounds = turf.bbox(feat);

        if (!this.stats.bounds.length) {
            this.stats.bounds = bounds;
            return;
        }

        if (bounds[0] < this.stats.bounds[0]) {
            this.stats.bounds[0] = bounds[0];
        }

        if (bounds[1] < this.stats.bounds[1]) {
            this.stats.bounds[1] = bounds[1];
        }

        if (bounds[2] > this.stats.bounds[2]) {
            this.stats.bounds[2] = bounds[2];
        }

        if (bounds[3] > this.stats.bounds[3]) {
            this.stats.bounds[3] = bounds[3];
        }
    }
}

module.exports = Stats;
