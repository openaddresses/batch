'use strict';

const CP = require('child_process');
const split = require('split');
const stream = require('stream');
const transform = require('parallel-transform');

/**
 * @class Tippecanoe
 */
class Tippecanoe {

    /**
     * Create a new OsmiumTool instance
     *
     * @constructor
     */
    constructor() {
        try {
            CP.execSync(`
                tippecanoe --version 2>&1
            `);
        } catch (err) {
            throw new Error('tippecanoe not installed');
        }
    }

    /**
     * Generate a Mapbox Vector Tileset given a line delimited stream of GeoJSON features
     *
     * @param {Stream} feats Stream of GeoJSON features to vectorize
     * @param {String} output_path Path to write mbtiles to
     * @param {Object} options Optional Options
     * @param {boolean} options.std Don't squelch tippecanoe stderr/stdout [default: false]
     * @param {String} options.layer Layer name to put the data to [Default: out]
     * @param {Object} options.zoom Zoom Options
     * @param {Number} options.zoom.max Max zoom of tiles
     * @param {Number} options.zoom.min Min zoom of tiles
     *
     * @returns {Promise} true if the vectorization succeeds
     */
    tile(feats, output_path, options = {}) {
        return new Promise((resolve, reject) => {
            if (!feats) return reject(new Error('feats required'));
            if (!output_path) return reject(new Error('output_path required'));

            let base = [
                '-o', output_path
            ];

            if (options.layer) {
                base = base.concat([ '-l', options.layer ]);
            } else {
                base = base.concat([ '-l', 'out' ]);
            }

            if (options.zoom && options.zoom.max) {
                base = base.concat([ '-z', options.zoom.max ]);
            }
            if (options.zoom && options.zoom.min) {
                base = base.concat([ '-Z', options.zoom.min ]);
            }

            const tippecanoe = CP.spawn('tippecanoe', base, {
                env: process.env
            })
                .on('error', reject)
                .on('close', resolve)

            if (options.stdout) {
                tippecanoe.stdout.pipe(process.stdout);
                tippecanoe.stderr.pipe(process.stderr);
            }

            stream.pipeline(
                feats,
                split(),
                transform(100, (line, cb) => {
                    if (!line || !line.trim()) return cb(null, '');

                    const feat = JSON.parse(line);

                    if (feat.type === 'FeatureCollection') {
                        return cb(null, feat.features.map((f) => {
                            return JSON.stringify(f);
                        }).join('\n') + '\n');
                    } else {
                        return cb(null, line);
                    }
                }),
                tippecanoe.stdin
                , (err) => {
                    if (err) return reject(err);
                });
        });
    }
}

module.exports = Tippecanoe;
