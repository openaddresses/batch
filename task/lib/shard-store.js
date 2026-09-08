import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

function shardPath(tmp, idx, kind) {
    return path.resolve(tmp, 'shards', `tile-${idx}-${kind}.ndjson`);
}

/**
 * Open one append-mode core/borrowed file pair per tile under tmp/shards.
 * Each line is `{path, feature}` so the per-shard dedupe pass can still
 * compute source priority per original source file.
 */
export function openShardWriters(tmp, tileCount) {
    fs.mkdirSync(path.resolve(tmp, 'shards'), { recursive: true });
    const writers = [];
    for (let idx = 0; idx < tileCount; idx++) {
        writers.push({
            core: fs.createWriteStream(shardPath(tmp, idx, 'core')),
            borrowed: fs.createWriteStream(shardPath(tmp, idx, 'borrowed'))
        });
    }

    function writeLine(stream, sourcePath, feature) {
        stream.write(JSON.stringify({ path: sourcePath, feature }) + '\n');
    }

    return {
        writeCore(idx, sourcePath, feature) {
            writeLine(writers[idx].core, sourcePath, feature);
        },
        writeBorrowed(idx, sourcePath, feature) {
            writeLine(writers[idx].borrowed, sourcePath, feature);
        },
        async closeAll() {
            const streams = writers.flatMap((w) => [w.core, w.borrowed]);
            await Promise.all(streams.map((stream) => new Promise((resolve, reject) => {
                stream.end((err) => err ? reject(err) : resolve());
            })));
        }
    };
}

async function readGrouped(file) {
    const grouped = new Map();
    if (!fs.existsSync(file)) return grouped;

    const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
    for await (const line of rl) {
        if (!line.trim()) continue;
        const { path: sourcePath, feature } = JSON.parse(line);
        if (!grouped.has(sourcePath)) grouped.set(sourcePath, []);
        grouped.get(sourcePath).push(feature);
    }
    return grouped;
}

/** Read one tile's core and borrowed records, grouped by original source path. */
export async function readShard(tmp, idx) {
    return {
        core: await readGrouped(shardPath(tmp, idx, 'core')),
        borrowed: await readGrouped(shardPath(tmp, idx, 'borrowed'))
    };
}

/** Delete one tile's shard files once it has been processed. */
export function cleanupShard(tmp, idx) {
    for (const kind of ['core', 'borrowed']) {
        const file = shardPath(tmp, idx, kind);
        if (fs.existsSync(file)) fs.unlinkSync(file);
    }
}
