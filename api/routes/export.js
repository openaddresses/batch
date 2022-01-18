'use strict';
const { Err } = require('@openaddresses/batch-schema');
const Job = require('../lib/job');
const Exporter = require('../lib/exporter');

async function router(schema, config) {
    const user = new (require('../lib/user'))(config.pool);

    /**
     * @api {post} /api/export Create Export
     * @apiVersion 1.0.0
     * @apiName CreateExport
     * @apiGroup Exports
     * @apiPermission user
     *
     * @apiDescription
     *   Create a new export task
     *
     * @apiSchema (Body) {jsonschema=../schema/req.body.CreateExport.json} apiParam
     * @apiSchema {jsonschema=../schema/res.Export.json} apiSuccess
     */
    await schema.post('/export', {
        body: 'req.body.CreateExport.json',
        res: 'res.Export.json'
    }, async (req, res) => {
        try {
            await user.is_level(req, 'backer');

            if (req.auth.access !== 'admin' && await Exporter.count(config.pool, req.auth.uid) >= config.limits.exports) {
                throw new Err(400, null, 'Reached Monthly Export Limit');
            }

            const job = await Job.from(config.pool, req.body.job_id);
            if (job.status !== 'Success') throw new Err(400, null, 'Cannot export a job that was not successful');

            req.body.uid = req.auth.uid;

            const exp = await Exporter.generate(config.pool, req.body);
            await exp.batch();
            return res.json(exp.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/export/:exportid/log Get Export Log
     * @apiVersion 1.0.0
     * @apiName ExportSingleLog
     * @apiGroup Export
     * @apiPermission user
     *
     * @apiDescription
     *   Return the batch-machine processing log for a given export
     *   Note: These are stored in AWS CloudWatch and *do* expire
     *   The presence of a loglink on a export does not guarantee log retention
     *
     * @apiParam {Number} :exportid Export ID
     *
     * @apiSchema {jsonschema=../schema/res.SingleLog.json} apiSuccess
     */
    await schema.get('/export/:exportid/log', {
        ':exportid': 'integer',
        res: 'res.SingleLog.json'
    }, async (req, res) => {
        try {
            const exp = await Exporter.from(config.pool, req.params.exportid);
            if (req.auth.access !== 'admin' && req.auth.uid !== exp.uid) throw new Err(403, null, 'You didn\'t create that export');

            return res.json(await exp.log());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/export List Export
     * @apiVersion 1.0.0
     * @apiName ListExport
     * @apiGroup Exports
     * @apiPermission user
     *
     * @apiDescription
     *   List existing exports
     *
     * @apiSchema (Query) {jsonschema=../schema/req.query.ListExport.json} apiParam
     * @apiSchema {jsonschema=../schema/res.ListExport.json} apiSuccess
     */
    await schema.get('/export', {
        query: 'req.query.ListExport.json',
        res: 'res.ListExport.json'
    }, async (req, res) => {
        try {
            if (req.auth.access !== 'admin') {
                req.query.uid = req.auth.uid;
            }

            res.json(await Exporter.list(config.pool, req.query));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/export/:export Get Export
     * @apiVersion 1.0.0
     * @apiName GetExport
     * @apiGroup Exports
     * @apiPermission user
     *
     * @apiDescription
     *   Get a single export
     *
     * @apiSchema {jsonschema=../schema/res.Export.json} apiSuccess
     */
    await schema.get('/export/:exportid', {
        ':exportid': 'integer',
        res: 'res.Export.json'
    }, async (req, res) => {
        try {
            const exp = (await Exporter.from(config.pool, req.params.exportid)).serialize();
            if (req.auth.access !== 'admin' && req.auth.uid !== exp.uid) throw new Err(403, null, 'You didn\'t create that export');

            res.json(exp);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/export/:exportid/output/export.zip Get Export Data
     * @apiVersion 1.0.0
     * @apiName DataExport
     * @apiGroup Exports
     * @apiPermission user
     *
     * @apiDescription
     *   Download the data created in an export
     *
     * @apiParam {Number} :exportid Export ID
     */
    await schema.get('/export/:exportid/output/export.zip', {
        ':exportid': 'integer'
    }, async (req, res) => {
        try {
            await user.is_auth(req, true);

            await Exporter.data(config.pool, req.auth, req.params.exportid, res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {patch} /api/export/:export Patch Export
     * @apiVersion 1.0.0
     * @apiName PatchExport
     * @apiGroup Exports
     * @apiPermission admin
     *
     * @apiDescription
     *   Update a single export
     *
     * @apiSchema (Body) {jsonschema=../schema/req.body.PatchExport.json} apiParam
     * @apiSchema {jsonschema=../schema/res.Export.json} apiSuccess
     */
    await schema.patch('/export/:exportid', {
        ':exportid': 'integer',
        body: 'req.body.PatchExport.json',
        res: 'res.Export.json'
    }, async (req, res) => {
        try {
            await user.is_admin(req);

            const exp = await Exporter.from(config.pool, req.params.exportid);
            exp.patch(req.body);
            await exp.commit(config.pool);

            return res.json(exp.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}

module.exports = router;
