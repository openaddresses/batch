import test from 'tape';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openShardWriters, readShard, cleanupShard } from '../lib/shard-store.js';

function feature(id) {
    return { type: 'Feature', properties: { id }, geometry: { type: 'Point', coordinates: [0, 0] } };
}

test('shard-store writes core/borrowed lines grouped by source path and reads them back', async (t) => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shard-store-'));
    const writers = openShardWriters(tmp, 2);

    writers.writeCore(0, 'us/ca/oakland.json', feature(1));
    writers.writeCore(0, 'us/ca/oakland.json', feature(2));
    writers.writeBorrowed(0, 'us/ca/alameda_county.json', feature(3));
    writers.writeCore(1, 'us/ny/nyc.json', feature(4));

    await writers.closeAll();

    const shard0 = await readShard(tmp, 0);
    t.equals(shard0.core.get('us/ca/oakland.json').length, 2, 'both core features grouped under their source path');
    t.equals(shard0.borrowed.get('us/ca/alameda_county.json').length, 1);

    const shard1 = await readShard(tmp, 1);
    t.equals(shard1.core.get('us/ny/nyc.json').length, 1);
    t.equals(shard1.borrowed.size, 0, 'a tile with nothing borrowed reads back an empty map');

    cleanupShard(tmp, 0);
    cleanupShard(tmp, 1);
    t.equals(fs.readdirSync(path.join(tmp, 'shards')).length, 0, 'cleanup removes every shard file');

    fs.rmSync(tmp, { recursive: true, force: true });
    t.end();
});
