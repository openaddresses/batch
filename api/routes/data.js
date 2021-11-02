<<<<<<< HEAD
'use strict';

const Err = require('../lib/error');
const Data = require('../lib/data');
const { Miss } = require('../lib/cacher');
const { Param }= require('../lib/util');

async function router(schema, config) {
=======
const { Err } = require('@openaddresses/batch-schema');
const Data = require('../lib/data');
const Cacher = require('../lib/cacher');
const Miss = Cacher.Miss;

async function router(schema, config) {
    const user = new (require('../lib/user'))(config.pool);

>>>>>>> 4216367e2bbdb933128338555dfb05ca0b7ceacd
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
<<<<<<< HEAD
     * @apiSchema (Query) {jsonawait schema=./schema/req.query.ListData.json} apiParam
     * @apiSchema {jsonawait schema=./schema/res.ListData.json} apiSuccess
     */
    await schema.get( '/data', {
=======
     * @apiSchema (Query) {jsonschema=../schema/req.query.ListData.json} apiParam
     * @apiSchema {jsonschema=../schema/res.ListData.json} apiSuccess
     */
    await schema.get('/data', {
>>>>>>> 4216367e2bbdb933128338555dfb05ca0b7ceacd
        query: 'req.query.ListData.json',
        res: 'res.ListData.json'
    }, async (req, res) => {
        try {
            const data = await config.cacher.get(Miss(req.query, 'data'), async () => {
                return await Data.list(config.pool, req.query);
            });

<<<<<<< HEAD
=======
            if (!req.auth || !req.auth.level || req.auth.level !== 'sponsor') {
                for (const d of data) {
                    delete d.s3;
                }
            }

>>>>>>> 4216367e2bbdb933128338555dfb05ca0b7ceacd
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
<<<<<<< HEAD
     * @apiSchema (Body) {jsonawait schema=./schema/req.body.PatchData.json} apiParam
     * @apiSchema {jsonawait schema=./schema/res.Data.json} apiSuccess
     *
     */
    await schema.patch( '/data/:data', {
=======
     * @apiSchema (Body) {jsonschema=../schema/req.body.PatchData.json} apiParam
     * @apiSchema {jsonschema=../schema/res.Data.json} apiSuccess
     *
     */
    await schema.patch('/data/:data', {
        ':data': 'integer',
>>>>>>> 4216367e2bbdb933128338555dfb05ca0b7ceacd
        body: 'req.body.PatchData.json',
        res: 'res.Data.json'
    }, async (req, res) => {
        try {
<<<<<<< HEAD
            await Param.int(req, 'data');

=======
>>>>>>> 4216367e2bbdb933128338555dfb05ca0b7ceacd
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
<<<<<<< HEAD
     * @apiSchema {jsonawait schema=./schema/res.Data.json} apiSuccess
     */
    await schema.get( '/data/:data', {
        res: 'res.Data.json'
    }, async (req, res) => {
        try {
            await Param.int(req, 'data');

=======
     * @apiSchema {jsonschema=../schema/res.Data.json} apiSuccess
     */
    await schema.get('/data/:data', {
        ':data': 'integer',
        res: 'res.Data.json'
    }, async (req, res) => {
        try {
>>>>>>> 4216367e2bbdb933128338555dfb05ca0b7ceacd
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
<<<<<<< HEAD
     * @apiSchema {jsonawait schema=./schema/res.DataHistory.json} apiSuccess
     */
    await schema.get( '/data/:data/history', {
=======
     * @apiSchema {jsonschema=../schema/res.DataHistory.json} apiSuccess
     */
    await schema.get('/data/:data/history', {
        ':data': 'integer',
>>>>>>> 4216367e2bbdb933128338555dfb05ca0b7ceacd
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
