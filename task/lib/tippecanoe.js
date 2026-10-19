import CP from 'child_process';
import fs from 'fs';
import stream from 'stream';
import split from 'split2';

// How often a running tippecanoe logs its memory and last-seen progress. A
// tippecanoe that dies mid-tiling (std::bad_alloc, 2026-10-18 and 10-19)
// left no trace of which shard or tile it was on, since its progress output
// is filtered out below.
const MONITOR_INTERVAL_MS = 60 * 1000;

/**
 * Parse the resident and peak resident memory out of a /proc/<pid>/status
 * file (Linux only), in kB. Missing fields come back as null.
 *
 * @param {String} text Contents of /proc/<pid>/status
 * @returns {{ rssKb: (Number|null), peakKb: (Number|null) }}
 */
export function parseProcStatus(text) {
    const field = (name) => {
        const match = new RegExp(`^${name}:\\s*(\\d+)\\s*kB`, 'm').exec(text);
        return match ? Number(match[1]) : null;
    };

    return { rssKb: field('VmRSS'), peakKb: field('VmHWM') };
}

function readProcStatus(pid) {
    try {
        return parseProcStatus(fs.readFileSync(`/proc/${pid}/status`, 'utf8'));
    } catch {
        return null;
    }
}

/**
 * Create a new Tippecanoe instance
 *
 * @class
 */
export default class Tippecanoe {
    constructor() {
        try {
            CP.execSync('tippecanoe --version 2>&1');
            CP.execSync('which tile-join');
        } catch (err) {
            throw new Error('tippecanoe not installed', err);
        }
    }

    /**
     * Generate a Mapbox Vector Tileset given a line delimited stream of GeoJSON features
     *
     * @param {Stream} feats Stream of GeoJSON features to vectorize
     * @param {String} output_path Path to write mbtiles to
     * @param {Object} options Optional Options
     * @param {boolean} options.std Don't squelch tippecanoe stderr/stdout [default: false]
     * @param {String} options.name Human-readable name for the tileset
     * @param {String} options.attribution Attribution (HTML) to be shown with maps that use data from this tileset
     * @param {String} options.description Description for the tileset
     * @param {String} options.layer Layer name to put the data to [Default: out]
     * @param {Object} options.zoom Zoom Options
     * @param {Number} options.zoom.max Max zoom of tiles
     * @param {Number} options.zoom.min Min zoom of tiles
     * @param {Boolean} [options.excludeAttributes=false] Drop all feature attributes (--exclude-all), keeping only geometry
     * @param {Boolean} [options.labelPoints=false] Replace polygons with label points (--convert-polygons-to-label-points)
     * @param {String} [options.label] Name for this run in the periodic memory/progress log lines [default: the layer]
     * @param {Number} [options.monitorIntervalMs=60000] How often to log that run's memory and last progress
     * @param {Boolean} [options.parallel=false] Use multiple CPUs for tiling (-P flag)
     * @param {Boolean} options.force Delete the mbtiles file if it already exists instead of giving an error
     * @param {Object} options.limit Limit Options
     * @param {Boolean} [options.limit.features=true] Limit tiles to 200,000 features
     * @param {Boolean} [options.limit.size=true] Limit tiles to 500K bytes
     *
     * @returns {Promise} true if the vectorization succeeds
     */
    tile(feats, output_path, options = {}) {
        return new Promise((resolve, reject) => {
            if (!feats) return reject(new Error('feats required'));
            if (!output_path) return reject(new Error('output_path required'));

            if (!options.zoom) options.zoom = {};
            if (!options.limit) options.limit = {};

            let base = [
                '-o', output_path
            ];

            base = base.concat(['-l', options.layer || 'out']);

            if (options.force) base = base.concat(['-f']);
            if (options.name) base = base.concat(['-n', `"${options.name}"`]);
            if (options.attribution) base = base.concat(['-A', `"${options.attribution}"`]);
            if (options.description) base = base.concat(['-N', `"${options.description}"`]);
            if (options.zoom.max) base = base.concat(['--maximum-zoom', options.zoom.max]);
            if (options.zoom.min) base = base.concat(['--minimum-zoom', options.zoom.min]);
            if (options.limit.features === false) base = base.concat(['--no-feature-limit']);
            if (options.limit.size === false) base = base.concat(['--no-tile-size-limit']);
            if (options.drop) base = base.concat(['--drop-densest-as-needed']);
            if (options.excludeAttributes) base = base.concat(['--exclude-all']);
            if (options.labelPoints) base = base.concat(['--convert-polygons-to-label-points']);
            if (options.parallel) base = base.concat(['-P']);

            const tippecanoe = CP.spawn('tippecanoe', base, {
                env: process.env
            })
                .on('error', reject)
                .on('close', (code) => {
                    if (code !== 0) return reject(new Error(`tippecanoe exited with code ${code}`));
                    return resolve();
                });

            if (options.std) {
                tippecanoe.stdout.pipe(process.stdout);

                const label = options.label || options.layer || 'out';
                let lastProgress = null;

                // tippecanoe separates its progress updates with \r, so split on
                // that as well as newlines to tell progress from real messages
                tippecanoe.stderr
                    .pipe(split(/[\r\n]+/))
                    .on('data', (line) => {
                        if (!line.trim()) return;
                        if (/^\s*\d+\.\d+%\s/.test(line) || /^Reordering geometry:\s*\d+/.test(line) || /^Read \d+\.\d+ million features/.test(line)) {
                            lastProgress = line.trim();
                            return;
                        }
                        process.stderr.write(line + '\n');
                    });

                const monitor = setInterval(() => {
                    const mem = tippecanoe.pid ? readProcStatus(tippecanoe.pid) : null;
                    const gb = (kb) => (kb / 1048576).toFixed(1);
                    const memory = mem && mem.rssKb !== null ? `rss ${gb(mem.rssKb)}GB (peak ${gb(mem.peakKb)}GB)` : 'rss unknown';
                    console.error(`ok - tippecanoe ${label}: ${memory}${lastProgress ? `, last progress: ${lastProgress}` : ''}`);
                }, options.monitorIntervalMs || MONITOR_INTERVAL_MS);
                monitor.unref();

                tippecanoe.on('close', () => clearInterval(monitor));
            }

            stream.pipeline(
                feats,
                tippecanoe.stdin, (err) => {
                    if (err) return reject(err);
                });
        });
    }

    /**
     * Join multiple MBTiles into a single MBTiles
     *
     * Note: tile-join has no flag to disable its own feature-count cap -
     * passing --no-feature-limit to it fails with "unrecognized option".
     * --no-tile-size-limit *is* supported, though (confirmed empirically -
     * an earlier version of this comment claimed otherwise). Without it,
     * any merged tile over 500K - including one entirely within a single,
     * non-overlapping shard, not just tiles where shards collide - is
     * silently dropped from the output.
     *
     * @param {String} output_path Path to input MBTiles
     * @param {String[]} inputs Array of paths to input MBTiles
     * @param {Object} options Optional Options
     * @param {boolean} options.std Don't squelch tippecanoe stderr/stdout [default: false]
     * @param {Boolean} options.force Delete the mbtiles file if it already exists instead of giving an error
     * @param {Object} options.limit Limit Options
     * @param {Boolean} [options.limit.size=true] Limit tiles to 500K bytes
     * @param {Number} [options.threads=4] Max worker threads. tile-join decodes
     *        100 x threads tiles at once and defaults to every CPU on the host,
     *        so on a big instance with large tiles that is what exhausts memory.
     *
     * @returns {Promise}
     */
    join(output_path, inputs, options = {}) {
        return new Promise((resolve, reject) => {
            if (!output_path) return reject(new Error('output_path required'));
            if (!inputs || !inputs.length) return reject(new Error('inputs required'));

            if (!options.limit) options.limit = {};

            let base = [
                '-o', output_path
            ].concat(inputs);

            if (options.force) base = base.concat(['-f']);
            if (options.limit.size === false) base = base.concat(['--no-tile-size-limit']);

            const tilejoin = CP.spawn('tile-join', base, {
                env: { ...process.env, TIPPECANOE_MAX_THREADS: String(options.threads || 4) }
            })
                .on('error', reject)
                .on('close', (code) => {
                    if (code !== 0) return reject(new Error(`tile-join exited with code ${code}`));
                    return resolve();
                });

            if (options.std) {
                tilejoin.stdout.pipe(process.stdout);
                tilejoin.stderr.pipe(process.stderr);
            }
        });
    }
}
