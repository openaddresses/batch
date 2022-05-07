import { Err } from '@openaddresses/batch-schema';
import Data from '../lib/data.js';
import Cacher from '../lib/cacher.js';
import Auth from '../lib/auth.js';

export default async function router(schema, config) {
    /**
     * @api {get} /api/data List Data
     * @apiVersion 1.0.0
     * @apiName ListData
     * @apiGroup Data
     * @apiPermission public
     *
     * @apiDescription
     *   Get the latest successful run of a given geographic area
     *
     * @apiSchema (Query) {jsonschema=../schema/req.query.ListData.json} apiParam
     * @apiSchema {jsonschema=../schema/res.ListData.json} apiSuccess
     */
    await schema.get('/data', {
        query: 'req.query.ListData.json',
        res: 'res.ListData.json'
    }, async (req, res) => {
        try {
            const data = await config.cacher.get(Cacher.Miss(req.query, 'data'), async () => {
                return await Data.list(config.pool, req.query);
            });

            if (!req.auth || !req.auth.level || req.auth.level !== 'sponsor') {
                for (const d of data.results) {
                    delete d.s3;
                    delete d.s3_validated;
                }
            }

            return res.json(data.results);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {patch} /api/data/:data Update Data
     * @apiVersion 1.0.0
     * @apiName Update
     * @apiGroup Data
     * @apiPermission data
     *
     * @apiDescription
     *   Update an existing data object
     *
     * @apiParam {Number} :data Data
     *
     * @apiSchema (Body) {jsonschema=../schema/req.body.PatchData.json} apiParam
     * @apiSchema {jsonschema=../schema/res.Data.json} apiSuccess
     *
     */
    await schema.patch('/data/:data', {
        ':data': 'integer',
        body: 'req.body.PatchData.json',
        res: 'res.Data.json'
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            req.body.id = req.params.data;

            await config.cacher.del('data');

            return res.json(await Data.commit(config.pool, req.body));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {delete} /api/data/:data Delete Data
     * @apiVersion 1.0.0
     * @apiName DeleteData
     * @apiGroup Data
     * @apiPermission public
     *
     * @apiDescription
     *   Remove a given data entry
     *
     * @apiParam {Number} :data Data
     *
     * @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
     */
    await schema.delete('/data/:data', {
        ':data': 'integer',
        res: 'res.Standard.json'
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            const data = await Data.from(config.pool, req.params.data);
            await data.delete(config.pool);
            await config.cacher.del('data');

            return res.json(data);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/data/:data Get Data
     * @apiVersion 1.0.0
     * @apiName SingleData
     * @apiGroup Data
     * @apiPermission public
     *
     * @apiDescription
     *   Return all information about a specific data segment
     *
     * @apiParam {Number} :data Data
     *
     * @apiSchema {jsonschema=../schema/res.Data.json} apiSuccess
     */
    await schema.get('/data/:data', {
        ':data': 'integer',
        res: 'res.Data.json'
    }, async (req, res) => {
        try {
            const data = await Data.from(config.pool, req.params.data);

            if (!req.auth || !req.auth.level || req.auth.level !== 'sponsor') {
                delete data.s3;
                delete data.s3_validated;
            }

            return res.json(data);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/data/:data/history Return Data History
     * @apiVersion 1.0.0
     * @apiName SingleHistoryData
     * @apiGroup Data
     * @apiPermission public
     *
     * @apiDescription
     *   Return the job history for a given data component
     *
     * @apiParam {Number} :data Data
     *
     * @apiSchema {jsonschema=../schema/res.DataHistory.json} apiSuccess
     */
    await schema.get('/data/:data/history', {
        ':data': 'integer',
        res: 'res.DataHistory.json'
    }, async (req, res) => {
        try {
            const history = await Data.history(config.pool, req.params.data);

            return res.json(history);
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
