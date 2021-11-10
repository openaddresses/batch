const { Err } = require('@openaddresses/batch-schema');
const Run = require('../lib/run');

async function router(schema, config) {
    const user = new (require('../lib/user'))(config.pool);

    /**
     * @api {get} /api/run List Runs
     * @apiVersion 1.0.0
     * @apiName ListRuns
     * @apiGroup Run
     * @apiPermission public
     *
     * @apiDescription
     *   Runs are container objects that contain jobs that were started at the same time or by the same process
     *
     * @apiSchema (Query) {jsonschema=../schema/req.query.ListRuns.json} apiParam
     * @apiSchema {jsonschema=../schema/res.ListRuns.json} apiSuccess
     */
    await schema.get('/run', {
        query: 'req.query.ListRuns.json',
        res: 'res.ListRuns.json'
    }, async (req, res) => {
        try {
            if (req.query.status) req.query.status = req.query.status.split(',');
            const runs = await Run.list(config.pool, req.query);

            return res.json(runs);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/run Create Run
     * @apiVersion 1.0.0
     * @apiName CreateRun
     * @apiGroup Run
     * @apiPermission admin
     *
     * @apiDescription
     *   Create a new run to hold a batch of jobs
     *
     * @apiSchema (Body) {jsonschema=../schema/req.body.CreateRun.json} apiParam
     * @apiSchema {jsonschema=../schema/res.Run.json} apiSuccess
     */
    await schema.post('/run', {
        body: 'req.body.CreateRun.json',
        res: 'res.Run.json'
    }, async (req, res) => {
        try {
            await user.is_admin(req);

            const run = await Run.generate(config.pool, req.body);

            return res.json(run.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/run/:run Get Run
     * @apiVersion 1.0.0
     * @apiName Single
     * @apiGroup Run
     * @apiPermission public
     *
     * @apiParam {Number} :run Run ID
     *
     * @apiSchema {jsonschema=../schema/res.Run.json} apiSuccess
     */
    await schema.get('/run/:run', {
        ':run': 'integer',
        res: 'res.Run.json'
    }, async (req, res) => {
        try {
            res.json(await Run.from(config.pool, req.params.run));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/run/:run/count Run Stats
     * @apiVersion 1.0.0
     * @apiName RunStats
     * @apiGroup Run
     * @apiPermission public
     *
     * @apiDescription
     *     Return statistics about jobs within a given run
     *
     * @apiParam {Number} :run Run ID
     *
     * @apiSchema {jsonschema=../schema/res.RunStats.json} apiSuccess
     */
    await schema.get('/run/:run/count', {
        ':run': 'integer',
        res: 'res.RunStats.json'
    }, async (req, res) => {
        try {
            res.json(await Run.stats(config.pool, req.params.run));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {patch} /api/run/:run Update Run
     * @apiVersion 1.0.0
     * @apiName Update
     * @apiGroup Run
     * @apiPermission public
     *
     * @apiDescription
     *   Update an existing run
     *
     * @apiParam {Number} :run Run ID
     *
     * @apiSchema (Body) {jsonschema=../schema/req.body.PatchRun.json} apiParam
     * @apiSchema {jsonschema=../schema/res.Run.json} apiSuccess
     *
     */
    await schema.patch('/run/:run', {
        ':run': 'integer',
        body: 'req.body.PatchRun.json',
        res: 'res.Run.json'
    }, async (req, res) => {
        try {
            await user.is_admin(req);

            const run = await Run.from(config.pool, req.params.run);

            // The CI is making a CI run "live" and updating the /data list
            if ((!run.live && req.body.live) || (run.live && !req.body.live)) await config.cacher.del('data');

            run.patch(req.body);
            await run.commit(config.pool);

            return res.json(run.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/run/:run/jobs Populate Run Jobs
     * @apiVersion 1.0.0
     * @apiName SingleJobsCreate
     * @apiGroup Run
     * @apiPermission admin
     *
     * @apiDescription
     *     Given an array sources, explode it into multiple jobs and submit to batch
     *     or pass in a predefined list of sources/layer/names
     *
     *     Note: once jobs are attached to a run, the run is "closed" and subsequent
     *     jobs cannot be attached to it
     *
     * @apiParam {Number} :run Run ID
     *
     * @apiSchema (Body) {jsonschema=../schema/req.body.SingleJobsCreate.json} apiParam
     * @apiSchema {jsonschema=../schema/res.SingleJobsCreate.json} apiSuccess
     */
    await schema.post('/run/:run/jobs', {
        ':run': 'integer',
        body: 'req.body.SingleJobsCreate.json',
        res: 'res.SingleJobsCreate.json'
    }, async (req, res) => {
        try {
            await user.is_admin(req);

            return res.json(await Run.populate(config.pool, req.params.run, req.body.jobs));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/run/:run/jobs List Run Jobs
     * @apiVersion 1.0.0
     * @apiName SingleJobs
     * @apiGroup Run
     * @apiPermission public
     *
     * @apiDescription
     *     Return all jobs for a given run
     *
     * @apiParam {Number} :run Run ID
     *
     * @apiSchema {jsonschema=../schema/res.SingleJobs.json} apiSuccess
     */
    await schema.get('/run/:run/jobs', {
        ':run': 'integer',
        res: 'res.SingleJobs.json'
    }, async (req, res) => {
        try {
            const jobs = await Run.jobs(config.pool, req.params.run);

            res.json({
                run: req.params.run,
                jobs: jobs
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });

}

module.exports = router;
