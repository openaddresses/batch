import { Err } from '@openaddresses/batch-schema';
import Data from '../lib/data.js';
import Cacher from '../lib/cacher.js';

export default async function router(schema, config) {
    const user = new (require('../lib/user'))(config.pool);

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
                for (const d of data) {
                    delete d.s3;
                    delete d.s3_validated;
                }
            }

            return res.json(data);
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
     * @apiParam {Number} :data Data ID
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
            await user.is_admin(req);

            req.body.id = req.params.data;

            await config.cacher.del('data');

            return res.json(await Data.commit(config.pool, req.body));
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
     * @apiParam {Number} :data Data ID
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
     * @apiParam {Number} :data Data ID
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
