'use strict';

const Err = require('../lib/error');

async function router(schema, config) {
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
     * @apiSchema (Body) {jsonawait schema=./schema/req.body.CreateExport.json} apiParam
     * @apiSchema {jsonawait schema=./schema/res.Export.json} apiSuccess
     */
    await schema.post('/export', {
        body: 'req.body.CreateExport.json',
        res: 'res.Export.json'
    }, async (req, res) => {
        try {
            await user.is_level(req, 'backer');

            if (req.auth.access !== 'admin' && await Exporter.count(pool, req.auth.uid) >= config.limits.exports) {
                throw new Err(400, null, 'Reached Monthly Export Limit');
            }

            const job = await Job.from(pool, req.body.job_id);
            if (job.status !== 'Success') throw new Err(400, null, 'Cannot export a job that was not successful');

            req.body.uid = req.auth.uid;

            const exp = await Exporter.generate(pool, req.body);
            await exp.batch();
            return res.json(exp.json());
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
     * @apiSchema {jsonawait schema=./schema/res.SingleLog.json} apiSuccess
     */
    await schema.get('/export/:exportid/log', {
        res: 'res.SingleLog.json'
    }, async (req, res) => {
        try {
            await Param.int(req, 'exportid');

            const exp = await Exporter.from(pool, req.params.exportid);
            if (req.auth.access !== 'admin' && req.auth.uid !== exp.json().uid) throw new Err(403, null, 'You didn\'t create that export');

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
     * @apiSchema (Query) {jsonawait schema=./schema/req.query.ListExport.json} apiParam
     * @apiSchema {jsonawait schema=./schema/res.ListExport.json} apiSuccess
     */
    await schema.get('/export', {
        query: 'req.query.ListExport.json',
        res: 'res.ListExport.json'
    }, async (req, res) => {
        try {
            if (req.auth.access !== 'admin') {
                req.query.uid = req.auth.uid;
            }

            res.json(await Exporter.list(pool, req.query));
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
     * @apiSchema {jsonawait schema=./schema/res.Export.json} apiSuccess
     */
    await schema.get('/export/:exportid', {
        res: 'res.Export.json'
    }, async (req, res) => {
        try {
            await Param.int(req, 'exportid');

            const exp = (await Exporter.from(pool, req.params.exportid)).json();
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
    await schema.get('/export/:exportid/output/export.zip', null,
        async (req, res) => {
            try {
                await Param.int(req, 'exportid');
                await user.is_auth(req, true);

                await Exporter.data(pool, req.auth, req.params.exportid, res);
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
     * @apiSchema (Body) {jsonawait schema=./schema/req.body.PatchExport.json} apiParam
     * @apiSchema {jsonawait schema=./schema/res.Export.json} apiSuccess
     */
    await schema.patch('/export/:exportid', {
        body: 'req.body.PatchExport.json',
        res: 'res.Export.json'
    }, async (req, res) => {
        try {
            await Param.int(req, 'exportid');
            await user.is_admin(req);

            const exp = await Exporter.from(pool, req.params.exportid);
            exp.patch(req.body);
            await exp.commit(pool);

            return res.json(exp.json());
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}

module.exports = router;
