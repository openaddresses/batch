import test from 'node:test';
import assert from 'assert';
import Collection from '../lib/types/collections.js';

process.env.Bucket = 'v2.openaddresses.io';
process.env.StackName = 'test';

test('Collection#_s3 sets both s3 and processed_s3', () => {
    // Generic's constructor requires a pool object with a .query method,
    // but _s3() never touches the DB - a stub is enough here.
    const collection = new Collection({ query: () => {} });
    collection.name = 'global';
    collection._s3();

    assert.equal(collection.s3, 's3://v2.openaddresses.io/test/collection-global.zip');
    assert.equal(collection.processed_s3, 's3://v2.openaddresses.io/test/collection-global-processed.zip');
});
