const Err = require('../lib/error');
const Collection = require('../lib/collections');
const Cacher = require('../lib/cacher');
const Miss = Cacher.Miss;
const { Param } = require('../lib/util');

async function router(schema, config) {
    const user = new (require('../lib/user'))(config.pool);

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
     * @apiSchema {jsonawait schema=./schema/res.ListCollections.json} apiSuccess
     */
    await schema.get('/collections', {
        res: 'res.ListCollections.json'
    }, async (req, res) => {
        try {
            const collections = await config.cacher.get(Miss(req.query, 'collection'), async () => {
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
     * @apiParam {Number} :collection Collection ID
     */
    await schema.get('/collections/:collection/data', null,
        async (req, res) => {
            try {
                await Param.int(req, 'collection');

                await user.is_auth(req, true);

                Collection.data(config.pool, req.params.collection, res);
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
     * @apiSchema {jsonawait schema=./schema/res.Standard.json} apiSuccess
     */
    await schema.delete('/collections/:collection', {
        res: 'res.Standard.json'
    }, async (req, res) => {
        try {
            await Param.int(req, 'collection');

            await user.is_admin(req);

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
     * @apiSchema (Body) {jsonawait schema=./schema/req.body.CreateCollection.json} apiParam
     * @apiSchema {jsonawait schema=./schema/res.Collection.json} apiSuccess
     */
    await schema.post('/collections', {
        body: 'req.body.CreateCollection.json',
        res: 'res.Collection.json'
    }, async (req, res) => {
        try {
            await user.is_admin(req);

            const collection = new Collection(req.body.name, req.body.sources);
            await collection.generate(config.pool);

            await config.cacher.del('collection');
            return res.json(collection.json());
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
     * @apiParam {Number} :collection Collection ID
     *
     * @apiSchema (Body) {jsonawait schema=./schema/req.body.PatchCollection.json} apiParam
     * @apiSchema {jsonawait schema=./schema/res.Collection.json} apiSuccess
     */
    await schema.patch('/collections/:collection', {
        body: 'req.body.PatchCollection.json',
        res: 'res.Collection.json'
    }, async (req, res) => {
        try {
            await Param.int(req, 'collection');

            await user.is_admin(req);

            const collection = await Collection.from(config.pool, req.params.collection);

            collection.patch(req.body);

            await collection.commit(config.pool);
            await config.cacher.del('collection');

            return res.json(collection.json());
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}

module.exports = router;
