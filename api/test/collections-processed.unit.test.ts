import test from 'node:test';
import assert from 'assert';
import Collection from '../lib/models/Collection.js';

process.env.Bucket = 'v2.openaddresses.io';
process.env.StackName = 'test';

test('Collection.s3 sets both s3 and processed_s3', () => {
    const collection = Collection.s3({ name: 'global' } as unknown as Parameters<typeof Collection.s3>[0]);

    assert.equal(collection.s3, 's3://v2.openaddresses.io/test/collection-global.zip');
    assert.equal(collection.processed_s3, 's3://v2.openaddresses.io/test/collection-global-processed.zip');
});
