import { Err } from '@openaddresses/batch-schema';
import Run from '../lib/run.js';
import Job from '../lib/job.js';
import Auth from '../lib/auth.js';
import CI from '../lib/ci.js';
import S3 from '../lib/s3.js';

export default async function router(schema, config) {
    const ci = new CI(config);

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
                    delete j.s3_validated;
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
     * @apiParam {Number} :job Job
     *
     * @apiSchema {jsonschema=../schema/res.Job.json} apiSuccess
     */
    await schema.get('/job/:job', {
        ':job': 'integer',
        res: 'res.Job.json'
    }, async (req, res) => {
        try {
            const job = await Job.from(config.pool, req.params.job);

            if (!req.auth || !req.auth.level || req.auth.level !== 'sponsor') {
                delete job.s3;
                delete job.s3_validated;
            }

            return res.json(job.serialize());
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
     * @apiParam {Number} :job Job
     */
    await schema.get('/job/:job/raw', {
        ':job': 'integer'
    }, async (req, res) => {
        try {
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
     * @apiParam {Number} :job Job
     *
     * @apiSchema {jsonschema=../schema/res.SingleJobsCreate.json} apiSuccess
     */
    await schema.post('/job/:job/rerun', {
        ':job': 'integer',
        res: 'res.SingleJobsCreate.json'
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

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
     * @apiParam {Number} :job Job
     *
     * @apiSchema {jsonschema=../schema/res.SingleDelta.json} apiSuccess
     */
    await schema.get('/job/:job/delta', {
        ':job': 'integer',
        res: 'res.SingleDelta.json'
    }, async (req, res) => {
        try {
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
    await schema.get('/job/:job/output/source.png', {
        ':job': 'integer'
    }, async (req, res) => {
        try {
            const s3 = new S3({
                Bucket: process.env.Bucket,
                Key: `${process.env.StackName}/job/${req.params.job}/source.png`
            });

            return s3.stream(res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/job/:job/output/validated.geojson.gz Validated Data
     * @apiVersion 1.0.0
     * @apiName JobValidatedData
     * @apiGroup Job
     * @apiPermission user
     *
     * @apiDescription
     *    Sponsors of our project recieve access to validated data as a way of saying thanks for
     *    keeping our project alive.
     *
     *    Note: the user must be authenticated to perform a download. One of our largest costs is
     *    S3 egress, authenticated downloads allow us to prevent abuse and keep the project running and the data freetw
     *
     *    Faster Downloads? Have AWS? The Jobs, Data, & Collections API all return an `s3` property which links
     *    to a requester pays object on S3. For those that are able, this is the best way to download data.
     *
     *    OpenAddresses is entirely funded by volunteers (many of then the developers themselves!)
     *    Please consider donating if you are able https://opencollective.com/openaddresses
     *
     * @apiParam {Number} :job Job
     */
    await schema.get('/job/:job/output/validated.geojson.gz', {
        ':job': 'integer'
    }, async (req, res) => {
        try {
            await Auth.is_level(req, 'sponsor');

            const job = await Job.from(config.pool, req.params.job);

            if (!job.output.validated) throw new Err(400, null, 'Job does not have validated data');

            const s3 = new S3({
                Bucket: process.env.Bucket,
                Key: `${process.env.StackName}/job/${req.params.job}/validated.geojson.gz`
            });

            return s3.stream(res, `${job.source_name}-${job.layer}-${job.name}-validated.geojson.gz`);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/job/:job/output/source.geojson.gz Get Job Data
     * @apiVersion 1.0.0
     * @apiName SingleOutputData
     * @apiGroup Job
     * @apiPermission user
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
     * @apiParam {Number} :job Job
     */
    await schema.get('/job/:job/output/source.geojson.gz', {
        ':job': 'integer'
    }, async (req, res) => {
        try {
            await Auth.is_auth(req, true);

            const job = await Job.from(config.pool, req.params.job);

            if (!job.output.output) throw new Err(400, null, 'Job does not have output data');

            const s3 = new S3({
                Bucket: process.env.Bucket,
                Key: `${process.env.StackName}/job/${req.params.job}/source.geojson.gz`
            });

            return s3.stream(res, `${job.source_name}-${job.layer}-${job.name}.geojson.gz`);
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
     * @apiParam {Number} :job Job
     */
    await schema.get('/job/:job/output/sample', {
        ':job': 'integer'
    }, async (req, res) => {
        try {
            const s3 = new S3({
                Bucket: process.env.Bucket,
                Key: `${process.env.StackName}/job/${req.params.job}/source.geojson.gz`
            });

            res.json(await s3.sample());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/job/:job/output/cache.zip Get Job Cache
     * @apiVersion 1.0.0
     * @apiName SingleOutputCache
     * @apiGroup Job
     * @apiPermission user
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
     * @apiParam {Number} :job Job
     *
     */
    await schema.get('/job/:job/output/cache.zip', {
        ':job': 'integer'
    }, async (req, res) => {
        try {
            await Auth.is_auth(req, true);

            const s3 = new S3({
                Bucket: process.env.Bucket,
                Key: `${process.env.StackName}/job/${req.params.job}/cache.zip`
            });

            return s3.stream(res);
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
     * @apiParam {Number} :job Job
     *
     * @apiSchema (Query) {jsonschema=../schema/req.query.SingleLog.json} apiParam
     * @apiSchema {jsonschema=../schema/res.SingleLog.json} apiSuccess
     */
    await schema.get('/job/:job/log', {
        ':job': 'integer',
        query: 'req.query.SingleLog.json',
        res: 'res.SingleLog.json'
    }, async (req, res) => {
        try {
            const job = await Job.from(config.pool, req.params.job);

            const log = await job.log(req.query.format);

            if (!req.query.dl) {
                if (!req.query.format || req.query.format === 'json') {
                    return res.json(log);
                } else {
                    return res.send(log);
                }
            } else {
                res.attachment(`log-${req.params.job}.${req.query.format || 'json'}`);
                res.send(log);
            }
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
     * @apiParam {Number} :job Job
     *
     * @apiSchema (Body) {jsonschema=../schema/req.body.PatchJob.json} apiParam
     * @apiSchema {jsonschema=../schema/res.Job.json} apiSuccess
     */
    await schema.patch('/job/:job', {
        ':job': 'integer',
        body: 'req.body.PatchJob.json',
        res: 'res.Job.json'
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            const job = await Job.from(config.pool, req.params.job);
            job.patch(req.body);
            await job.commit(config.pool);

            await Run.ping(config.pool, ci, job);

            return res.json(job.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

}
