import fs from 'fs';
import path from 'path';
import split from 'split';
import turf from '@turf/turf';
import { pipeline } from 'stream/promises';
import transform from 'parallel-transform';
import Validator from './validator';

export default class Stats {
    constructor(file, layer) {
        if (!file || typeof file !== 'string') throw new Error('Stats.file must be a string');
        if (!layer || typeof layer !== 'string') throw new Error('Stats.layer must be a string');

        this.file = file;
        this.layer = layer;

        this.stats = {
            count: 0,
            bounds: []
        };

        this.validated_path = false;
        if (this.layer === 'addresses') {
            this.validated_path = file + '.validated';
            this.validator = new Validator(this.layer, fs.createWriteStream(this.validated_path));
        } else {
            this.validator = new Validator(this.layer);
        }

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
                },
                validity: this.validator.stats
            };
        } else if (this.layer === 'buildings') {
            this.stats.buildings = {
                counts: {},
                validity: this.validator.stats
            };
        } else if (this.layer === 'parcels') {
            this.stats.parcels = {
                counts: {},
                validity: this.validator.stats
            };
        } else {
            this.stats[this.layer] = {
                counts: {},
                validity: this.validator.stats
            };
        }
    }

    async calc() {
        await pipeline(
            fs.createReadStream(path.resolve(this.file)),
            split(),
            transform(100, (data, cb) => {
                if (!data.trim().length) return cb(null, '');

                const feat = JSON.parse(data);

                this.stats.count++;

                this.bounds(feat);

                this.validator.test(feat);

                if (this.layer === 'addresses') {
                    this.addresses(feat);
                }

                return cb(null, '');
            }),
            fs.createWriteStream('/dev/null')
        );

        return this.stats;
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
