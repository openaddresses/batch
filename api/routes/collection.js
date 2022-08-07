import { Err } from '@openaddresses/batch-schema';
import { sql } from 'slonik';
import Collection from '../lib/collections.js';
import Cacher from '../lib/cacher.js';
import Auth from '../lib/auth.js';

export default async function router(schema, config) {
    /**
     * @api {get} /api/collections List Collections
     * @apiVersion 1.0.0
     * @apiName ListCollections
     * @apiGroup Collections
     * @apiPermission public
     *
     * @apiDescription
     *     Return a list of all collections and their glob rules
     *
     * @apiSchema {jsonschema=../schema/res.ListCollections.json} apiSuccess
     */
    await schema.get('/collections', {
        res: 'res.ListCollections.json'
    }, async (req, res) => {
        try {
            const collections = await config.cacher.get(Cacher.Miss(req.query, 'collection'), async () => {
                return await Collection.list(config.pool);
            });

            if (!req.auth || !req.auth.level || req.auth.level !== 'sponsor') {
                for (const c of collections) {
                    delete c.s3;
                }
            }

            return res.json(collections);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/collections/:collection/data Get Collection Data
     * @apiVersion 1.0.0
     * @apiName DataCollection
     * @apiGroup Collections
     * @apiPermission user
     *
     * @apiDescription
     *   Download a given collection file
     *
     *    Note: the user must be authenticated to perform a download. One of our largest costs is
     *    S3 egress, authenticated downloads allow us to prevent abuse, keep the project running and the data free.
     *
     *    Faster Downloads? Have AWS? The Jobs, Data, & Collections API all return an `s3` property which links
     *    to a requester pays object on S3. For those that are able, this is the best way to download data.
     *
     *    OpenAddresses is entirely funded by volunteers (many of them the developers themselves!)
     *    Please consider donating if you are able https://opencollective.com/openaddresses
     *
     * @apiParam {Number} :collection Collection
     */
    await schema.get('/collections/:collection/data', {
        ':collection': 'integer'
    }, async (req, res) => {
        try {
            await Auth.is_auth(req, true);

            Collection.data(config.pool, req.params.collection, res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/collections/:collection Get Collection
     * @apiVersion 1.0.0
     * @apiName GetCollection
     * @apiGroup Collections
     * @apiPermission public
     *
     * @apiDescription
     *   Get a given collection
     *
     * @apiParam {Number} :collection Collection
     *
     * @apiSchema {jsonschema=../schema/res.Collection.json} apiSuccess
     */
    await schema.get('/collections/:collection', {
        ':collection': 'integer',
        'res': 'res.Collection.json'
    }, async (req, res) => {
        try {
            await Auth.is_auth(req, true);

            const collection = await Collection.from(config.pool, req.params.collection);

            return res.json(collection.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {delete} /api/collections/:collection Delete Collection
     * @apiVersion 1.0.0
     * @apiName DeleteCollection
     * @apiGroup Collections
     * @apiPermission admin
     *
     * @apiDescription
     *   Delete a collection (This should not be done lightly)
     *
     * @apiParam {Number} :collection Collection ID
     *
     * @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
     */
    await schema.delete('/collections/:collection', {
        ':collection': 'integer',
        res: 'res.Standard.json'
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

    /**
     * @api {post} /api/collections Create Collection
     * @apiVersion 1.0.0
     * @apiName CreateCollection
     * @apiGroup Collections
     * @apiPermission admin
     *
     * @apiDescription
     *   Create a new collection
     *
     * @apiSchema (Body) {jsonschema=../schema/req.body.CreateCollection.json} apiParam
     * @apiSchema {jsonschema=../schema/res.Collection.json} apiSuccess
     */
    await schema.post('/collections', {
        body: 'req.body.CreateCollection.json',
        res: 'res.Collection.json'
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

    /**
     * @api {patch} /api/collections/:collection Patch Collection
     * @apiVersion 1.0.0
     * @apiName PatchCollection
     * @apiGroup Collections
     * @apiPermission admin
     *
     * @apiDescription
     *   Update a collection
     *
     * @apiParam {Number} :collection Collection
     *
     * @apiSchema (Body) {jsonschema=../schema/req.body.PatchCollection.json} apiParam
     * @apiSchema {jsonschema=../schema/res.Collection.json} apiSuccess
     */
    await schema.patch('/collections/:collection', {
        ':collection': 'integer',
        body: 'req.body.PatchCollection.json',
        res: 'res.Collection.json'
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            const collection = await Collection.from(config.pool, req.params.collection);
            await collection.commit(config.pool, null, {
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
