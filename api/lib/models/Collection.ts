import Modeler, { type GenericList, type GenericListInput } from '@openaddresses/batch-generic';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { InferSelectModel } from 'drizzle-orm';
import Err from '@openaddresses/batch-error';
import { Collection } from '../schema.js';

export type CollectionRow = InferSelectModel<typeof Collection>;
export type CollectionAugmented = CollectionRow & { s3?: string; processed_s3?: string };

export default class CollectionModel extends Modeler<typeof Collection> {
    constructor(pool: PostgresJsDatabase<Record<string, unknown>>) {
        super(pool, Collection);
    }

    /**
     * Attach the sponsor-only S3 locations to a collection
     */
    static s3(collection: CollectionAugmented): CollectionAugmented {
        collection.s3 = `s3://${process.env.Bucket}/${process.env.StackName}/collection-${collection.name}.zip`;
        collection.processed_s3 = `s3://${process.env.Bucket}/${process.env.StackName}/collection-${collection.name}-processed.zip`;
        return collection;
    }

    async list(query: GenericListInput = {}): Promise<GenericList<CollectionAugmented>> {
        const list = await super.list({
            limit: Infinity,
            ...query,
        });

        if (!list.items.length) {
            throw new Err(404, null, 'No collections found');
        }

        return {
            total: list.total,
            items: list.items.map(collection => CollectionModel.s3(collection)),
        };
    }
}
