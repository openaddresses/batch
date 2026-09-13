import Err from '@openaddresses/batch-error';
import { sql } from 'slonik';
import Collection from '../lib/types/collections.js';
import Cacher from '../lib/cacher.js';
import Auth from '../lib/auth.js';
import { Type } from '@sinclair/typebox';
import {
    ListCollectionsResponse,
    StandardResponse,
    CreateCollectionBody,
    CollectionResponse,
    PatchCollectionBody
} from '../lib/schema.js';

export default async function router(schema, config) {
    await schema.get('/collections', {
        name: 'List Collections',
        group: 'Collections',
        description: 'Return a list of all collections and their glob rules',
        res: ListCollectionsResponse
    }, async (req, res) => {
        try {
            const collections = await config.cacher.get(Cacher.Miss(req.query, 'collection'), async () => {
                return await Collection.list(config.pool);
            });

            if (!req.auth || !req.auth.level || req.auth.level !== 'sponsor') {
                for (const c of collections) {
                    delete c.s3;
                    delete c.processed_s3;
                }
            }

            return res.json(collections);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/collections/:collection/data', {
        name: 'Collection Data',
        group: 'Collections',
        description: `
            Download a given collection file

            Note: the user must be authenticated to perform a download. One of our largest costs is
            S3 egress, authenticated downloads allow us to prevent abuse, keep the project running and the data free.

            Faster Downloads? Have AWS? The Jobs, Data, & Collections API all return an "s3" property which links
            to a requester pays object on S3. For those that are able, this is the best way to download data.

            OpenAddresses is entirely funded by volunteers (many of them the developers themselves!)
            Please consider donating if you are able https://opencollective.com/openaddresses
        `,
        params: Type.Object({
            collection: Type.Integer()
        })
    }, async (req, res) => {
        try {
            await Auth.is_auth(req, true);

            const collection = await Collection.from(config.pool, req.params.collection);
            return res.redirect(`https://v2.openaddresses.io/${process.env.StackName}/collection-${collection.name}.zip`);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/collections/:collection/processed', {
        name: 'Collection Processed Data',
        group: 'Collections',
        description: `
            Download a given collection's deduped, backfilled processed dataset.

            Note: the user must be authenticated to perform a download. One of our largest costs is
            S3 egress, authenticated downloads allow us to prevent abuse, keep the project running and the data free.

            Faster Downloads? Have AWS? The Jobs, Data, & Collections API all return a "processed_s3" property which links
            to a requester pays object on S3. For those that are able, this is the best way to download data.

            OpenAddresses is entirely funded by volunteers (many of them the developers themselves!)
            Please consider donating if you are able https://opencollective.com/openaddresses
        `,
        params: Type.Object({
            collection: Type.Integer()
        })
    }, async (req, res) => {
        try {
            await Auth.is_auth(req, true);

            const collection = await Collection.from(config.pool, req.params.collection);
            return res.redirect(`https://v2.openaddresses.io/${process.env.StackName}/collection-${collection.name}-processed.zip`);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/collections/:collection', {
        name: 'Get Collection',
        group: 'Collections',
        description: 'Get a given collection',
        params: Type.Object({
            collection: Type.Integer()
        }),
        res: CollectionResponse
    }, async (req, res) => {
        try {
            await Auth.is_auth(req, true);

            const collection = await Collection.from(config.pool, req.params.collection);

            return res.json(collection.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.delete('/collections/:collection', {
        name: 'Delete Collection',
        group: 'Collections',
        description: 'Delete a collection (This should not be done lightly)',
        params: Type.Object({
            collection: Type.Integer()
        }),
        res: StandardResponse
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            await Collection.delete(config.pool, req.params.collection);

            return res.json({
                status: 200,
                message: 'Collection Deleted'
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.post('/collections', {
        name: 'Create Collection',
        group: 'Collections',
        description: 'Create a new collection',
        body: CreateCollectionBody,
        res: CollectionResponse
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            const collection = await Collection.generate(config.pool, {
                created: sql`NOW()`,
                ...req.body
            });

            await config.cacher.del('collection');

            if (req.auth && req.auth.level && req.auth.level === 'sponsor') {
                collection._s3();
            }

            return res.json(collection.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.patch('/collections/:collection', {
        name: 'Update Collection',
        group: 'Collections',
        description: 'Update a collection',
        params: Type.Object({
            collection: Type.Integer()
        }),
        body: PatchCollectionBody,
        res: CollectionResponse
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            const collection = await Collection.commit(config.pool, req.params.collection, {
                created: sql`NOW()`,
                ...req.body
            });

            await config.cacher.del('collection');

            collection._s3();

            return res.json(collection.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
