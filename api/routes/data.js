'use strict';

const Err = require('../lib/error');
const Data = require('../lib/data');
const { Miss } = require('../lib/cacher');

async function router(schema, config) {
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
     * @apiSchema (Query) {jsonawait schema=./schema/req.query.ListData.json} apiParam
     * @apiSchema {jsonawait schema=./schema/res.ListData.json} apiSuccess
     */
    await schema.get( '/data', {
        query: 'req.query.ListData.json',
        res: 'res.ListData.json'
    }, async (req, res) => {
        try {
            const data = await config.cacher.get(Miss(req.query, 'data'), async () => {
                return await Data.list(config.pool, req.query);
            });

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
     * @apiSchema (Body) {jsonawait schema=./schema/req.body.PatchData.json} apiParam
     * @apiSchema {jsonawait schema=./schema/res.Data.json} apiSuccess
     *
     */
    await schema.patch( '/data/:data', {
        body: 'req.body.PatchData.json',
        res: 'res.Data.json'
    }, async (req, res) => {
        try {
            await Param.int(req, 'data');

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
     * @apiSchema {jsonawait schema=./schema/res.Data.json} apiSuccess
     */
    await schema.get( '/data/:data', {
        res: 'res.Data.json'
    }, async (req, res) => {
        try {
            await Param.int(req, 'data');

            const data = await Data.from(config.pool, req.params.data);

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
     * @apiSchema {jsonawait schema=./schema/res.DataHistory.json} apiSuccess
     */
    await schema.get( '/data/:data/history', {
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

module.exports = router;
