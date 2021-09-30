const Err = require('../lib/error');
const Run = require('../lib/run');
const Job = require('../lib/job');
const { Param } = require('../lib/util');

async function router(schema, config) {
    const user = new (require('../lib/user'))(config.pool);
    const ci = new (require('../lib/ci'))(config);

    /**
     * @api {get} /api/job List Jobs
     * @apiVersion 1.0.0
     * @apiName ListJobs
     * @apiGroup Job
     * @apiPermission public
     *
     * @apiDescription
     *     Return information about a given subset of jobs
     *
     * @apiSchema (query) {jsonschema=../schema/req.query.ListJobs.json} apiParam
     * @apiSchema {jsonschema=../schema/res.ListJobs.json} apiSuccess
     */
    await schema.get('/job', {
        query: 'req.query.ListJobs.json',
        res: 'res.ListJobs.json'
    }, async (req, res) => {
        try {
            if (req.query.status) req.query.status = req.query.status.split(',');

            const jobs = await Job.list(config.pool, req.query);

            if (!req.auth || !req.auth.level || req.auth.level !== 'sponsor') {
                for (const j of jobs) {
                    delete j.s3;
                }
            }

            return res.json(jobs);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/job/:job Get Job
     * @apiVersion 1.0.0
     * @apiName Single
     * @apiGroup Job
     * @apiPermission public
     *
     * @apiDescription
     *     Return all information about a given job
     *
     * @apiParam {Number} :job Job ID
     *
     * @apiSchema {jsonschema=../schema/res.Job.json} apiSuccess
     */
    await schema.get('/job/:job', {
        res: 'res.Job.json'
    }, async (req, res) => {
        try {
            await Param.int(req, 'job');

            const job = (await Job.from(config.pool, req.params.job)).json();

            if (!req.auth || !req.auth.level || req.auth.level !== 'sponsor') {
                delete job.s3;
            }

            return res.json(job);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/job/:job/raw Raw Source
     * @apiVersion 1.0.0
     * @apiName RawSingle
     * @apiGroup Job
     * @apiPermission public
     *
     * @apiDescription
     *     Return the raw source from github - this API is not stable nor
     *     will it always return a consistent result
     *
     * @apiParam {Number} :job Job ID
     */
    await schema.get('/job/:job/raw', null,
        async (req, res) => {
            try {
                await Param.int(req, 'job');

                const job = await Job.from(config.pool, req.params.job);

                return res.json(await job.get_raw());
            } catch (err) {
                return Err.respond(err, res);
            }
        });

    /**
     * @api {post} /api/job/:job Rerun Job
     * @apiVersion 1.0.0
     * @apiName JobRerun
     * @apiGroup Job
     * @apiPermission admin
     *
     * @apiDescription
     *     Submit a job for reprocessing - often useful for network errors
     *
     * @apiParam {Number} :job Job ID
     *
     * @apiSchema {jsonschema=../schema/res.SingleJobsCreate.json} apiSuccess
     */
    await schema.post('/job/:job/rerun', {
        res: 'res.SingleJobsCreate.json'
    }, async (req, res) => {
        try {
            await Param.int(req, 'job');

            await user.is_admin(req);

            const job = await Job.from(config.pool, req.params.job);
            const run = await Run.from(config.pool, job.run);

            const new_run = await Run.generate(config.pool, {
                live: !!run.live
            });

            return res.json(await Run.populate(config.pool, new_run.id, [{
                source: job.source,
                layer: job.layer,
                name: job.name
            }]));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/job/:job/delta Job Stats Comparison
     * @apiVersion 1.0.0
     * @apiName SingleDelta
     * @apiGroup Job
     * @apiPermission public
     *
     * @apiDescription
     *   Compare the stats of the given job against the current live data job
     *
     * @apiParam {Number} :job Job ID
     *
     * @apiSchema {jsonschema=../schema/res.SingleDelta.json} apiSuccess
     */
    await schema.get('/job/:job/delta', {
        res: 'res.SingleDelta.json'
    }, async (req, res) => {
        try {
            await Param.int(req, 'job');

            const delta = await Job.delta(config.pool, req.params.job);

            return res.json(delta);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/job/:job/output/source.png Get Job Preview
     * @apiVersion 1.0.0
     * @apiName SingleOutputPreview
     * @apiGroup Job
     * @apiPermission public
     *
     * @apiDescription
     *   Return the preview image for a given job
     *
     * @apiParam {Number} :job Job ID
     */
    await schema.get('/job/:job/output/source.png', null,
        async (req, res) => {
            try {
                await Param.int(req, 'job');
                Job.preview(req.params.job, res);
            } catch (err) {
                return Err.respond(err, res);
            }
        });

    /**
     * @api {get} /api/job/:job/output/source.geojson.gz Get Job Data
     * @apiVersion 1.0.0
     * @apiName SingleOutputData
     * @apiGroup Job
     * @apiPermission public
     *
     * @apiDescription
     *    Note: the user must be authenticated to perform a download. One of our largest costs is
     *    S3 egress, authenticated downloads allow us to prevent abuse and keep the project running and the data freetw
     *
     *    Faster Downloads? Have AWS? The Jobs, Data, & Collections API all return an `s3` property which links
     *    to a requester pays object on S3. For those that are able, this is the best way to download data.
     *
     *    OpenAddresses is entirely funded by volunteers (many of then the developers themselves!)
     *    Please consider donating if you are able https://opencollective.com/openaddresses
     *
     * @apiParam {Number} :job Job ID
     */
    await schema.get('/job/:job/output/source.geojson.gz', null,
        async (req, res) => {
            try {
                await Param.int(req, 'job');

                await user.is_auth(req, true);

                await Job.data(config.pool, req.params.job, res);
            } catch (err) {
                return Err.respond(err, res);
            }
        });

    /**
     * @api {get} /api/job/:job/output/sample Small Sample
     * @apiVersion 1.0.0
     * @apiName SampleData
     * @apiGroup Job
     * @apiPermission public
     *
     * @apiDescription
     *   Return an Array containing a sample of the properties
     *
     * @apiParam {Number} :job Job ID
     */
    await schema.get('/job/:job/output/sample', null,
        async (req, res) => {
            try {
                await Param.int(req, 'job');

                return res.json(await Job.sample(config.pool, req.params.job));
            } catch (err) {
                return Err.respond(err, res);
            }
        });

    /**
     * @api {get} /api/job/:job/output/cache.zip Get Job Cache
     * @apiVersion 1.0.0
     * @apiName SingleOutputCache
     * @apiGroup Job
     * @apiPermission public
     *
     *  @apiDescription
     *    Note: the user must be authenticated to perform a download. One of our largest costs is
     *    S3 egress, authenticated downloads allow us to prevent abuse and keep the project running and the data freetw
     *
     *    Faster Downloads? Have AWS? The Jobs, Data, & Collections API all return an `s3` property which links
     *    to a requester pays object on S3. For those that are able, this is the best way to download data.
     *
     *    OpenAddresses is entirely funded by volunteers (many of then the developers themselves!)
     *    Please consider donating if you are able https://opencollective.com/openaddresses
     *
     * @apiParam {Number} :job Job ID
     *
     */
    await schema.get('/job/:job/output/cache.zip', null,
        async (req, res) => {
            try {
                await Param.int(req, 'job');

                await user.is_auth(req, true);

                Job.cache(req.params.job, res);
            } catch (err) {
                return Err.respond(err, res);
            }
        });

    /**
     * @api {get} /api/job/:job/log Get Job Log
     * @apiVersion 1.0.0
     * @apiName SingleLog
     * @apiGroup Job
     * @apiPermission public
     *
     * @apiDescription
     *   Return the batch-machine processing log for a given job
     *   Note: These are stored in AWS CloudWatch and *do* expire
     *   The presence of a loglink on a job, does not guarentree log retention
     *
     * @apiParam {Number} :job Job ID
     *
     * @apiSchema {jsonschema=../schema/res.SingleLog.json} apiSuccess
     */
    await schema.get('/job/:job/log', {
        res: 'res.SingleLog.json'
    }, async (req, res) => {
        try {
            await Param.int(req, 'job');

            const job = await Job.from(config.pool, req.params.job);

            return res.json(await job.log());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {patch} /api/job/:job Update Job
     * @apiVersion 1.0.0
     * @apiName JobPatch
     * @apiGroup Job
     * @apiPermission admin
     *
     * @apiDescription
     *   Update a job
     *
     * @apiParam {Number} :job Job ID
     *
     * @apiSchema (Body) {jsonschema=../schema/req.body.PatchJob.json} apiParam
     * @apiSchema {jsonschema=../schema/res.Job.json} apiSuccess
     */
    await schema.patch('/job/:job', {
        body: 'req.body.PatchJob.json',
        res: 'res.Job.json'
    }, async (req, res) => {
        try {
            await Param.int(req, 'job');

            await user.is_admin(req);

            const job = await Job.from(config.pool, req.params.job);
            job.patch(req.body);
            await job.commit(config.pool);

            await Run.ping(config.pool, ci, job);

            return res.json(job.json());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

}

module.exports = router;
