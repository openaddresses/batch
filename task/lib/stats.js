import fs from 'fs';
import split from 'split2';
import { bbox } from '@turf/turf';
import { pipeline } from 'stream/promises';
import Validator from './validator.js';
import { Transform } from 'stream';

export default class Stats {
    constructor(file, layer) {
        if (!(file instanceof URL)) throw new Error('Stats.file must be a URL');
        if (!layer || typeof layer !== 'string') throw new Error('Stats.layer must be a string');

        this.file = file;
        this.layer = layer;

        this.stats = {
            count: 0,
            bounds: []
        };

        this.validated_path = false;
        if (this.layer === 'addresses') {

            this.validated_path = new URL(file.href + '.validated');
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
            fs.createReadStream(this.file),
            split(),
            new Transform({
                objectMode: true,
                transform: (data, _, cb) => {
                    if (!data.trim().length) return cb(null, '');

                    const feat = JSON.parse(data);

                    this.stats.count++;

                    this.bounds(feat);

                    this.validator.test(feat);

                    if (this.layer === 'addresses') {
                        this.addresses(feat);
                    }

                    return cb(null, '');
                }
            }),
            fs.createWriteStream('/dev/null')
        );

        return this.stats;
    }

    addresses(feat) {
        if (feat.properties.unit && feat.properties.unit.trim().length > 0) this.stats.addresses.counts.unit++;
        if (feat.properties.number && feat.properties.number.trim().length > 0) this.stats.addresses.counts.number++;
        if (feat.properties.street && feat.properties.street.trim().length > 0) this.stats.addresses.counts.street++;
        if (feat.properties.city && feat.properties.city.trim().length > 0) this.stats.addresses.counts.city++;
        if (feat.properties.district && feat.properties.district.trim().length > 0) this.stats.addresses.counts.district++;
        if (feat.properties.region && feat.properties.region.trim().length > 0) this.stats.addresses.counts.region++;
        if (feat.properties.postcode && feat.properties.postcode.trim().length > 0) this.stats.addresses.counts.postcode++;
    }

    bounds(feat) {
        const bounds = bbox(feat);

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
