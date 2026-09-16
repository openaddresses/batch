import Modeler from '@openaddresses/batch-generic';
import Err from '@openaddresses/batch-error';
import { Collection } from '../schema.js';

export default class CollectionModel extends Modeler {
    constructor(pool) {
        super(pool, Collection);
    }

    /**
     * Attach the sponsor-only S3 locations to a collection
     *
     * @param {Object} collection Collection row
     */
    static s3(collection) {
        collection.s3 = `s3://${process.env.Bucket}/${process.env.StackName}/collection-${collection.name}.zip`;
        collection.processed_s3 = `s3://${process.env.Bucket}/${process.env.StackName}/collection-${collection.name}-processed.zip`;
        return collection;
    }

    async list(query = {}) {
        const list = await super.list({
            limit: Infinity,
            ...query
        });

        if (!list.items.length) {
            throw new Err(404, null, 'No collections found');
        }

        list.items = list.items.map((collection) => CollectionModel.s3(collection));

        return list;
    }
}
