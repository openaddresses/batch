import Err from '@openaddresses/batch-error';
import { sql } from 'slonik';
import Collection from '../lib/types/collections.js';
import Cacher from '../lib/cacher.js';
import Auth from '../lib/auth.js';

export default async function router(schema, config) {
    await schema.get('/collections', {
        name: 'List Collections',
        group: 'Collections',
        auth: 'public',
        description: 'Return a list of all collections and their glob rules',
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

    await schema.get('/collections/:collection/data', {
        name: 'Collection Data',
        group: 'Collections',
        auth: 'user',
        description: `
            Download a given collection file

            Note: the user must be authenticated to perform a download. One of our largest costs is
            S3 egress, authenticated downloads allow us to prevent abuse, keep the project running and the data free.

            Faster Downloads? Have AWS? The Jobs, Data, & Collections API all return an "s3" property which links
            to a requester pays object on S3. For those that are able, this is the best way to download data.

            OpenAddresses is entirely funded by volunteers (many of them the developers themselves!)
            Please consider donating if you are able https://opencollective.com/openaddresses
        `,
        ':collection': 'integer'
    }, async (req, res) => {
        try {
            await Auth.is_auth(req, true);

            const collection = await Collection.from(config.pool, req.params.collection);
            return res.redirect(`https://v2.openaddresses.io/${process.env.StackName}/collection-${collection.name}.zip`);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/collections/:collection', {
        name: 'Get Collection',
        group: 'Collections',
        auth: 'public',
        description: 'Get a given collection',
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

    await schema.delete('/collections/:collection', {
        name: 'Delete Collection',
        group: 'Collections',
        auth: 'admin',
        description: 'Delete a collection (This should not be done lightly)',
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

    await schema.post('/collections', {
        name: 'Create Collection',
        group: 'Collections',
        auth: 'admin',
        description: 'Create a new collection',
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

    await schema.patch('/collections/:collection', {
        name: 'Update Collection',
        group: 'Collections',
        auth: 'admin',
        description: 'Update a collection',
        ':collection': 'integer',
        body: 'req.body.PatchCollection.json',
        res: 'res.Collection.json'
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
