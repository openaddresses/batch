import { Err } from '@openaddresses/batch-schema';
import JobError from '../lib/joberror.js';
import Auth from '../lib/auth.js';
import CI from '../lib/ci.js';

export default async function router(schema, config) {
    const ci = new CI(config);

    /**
     * @api {get} /api/job/error Get Job Errors
     * @apiVersion 1.0.0
     * @apiName ErrorList
     * @apiGroup JobErrors
     * @apiPermission public
     *
     * @apiDescription
     *     All jobs that fail as part of a live run are entered into the JobError API
     *     This API powers a page that allows for human review of failing jobs
     *     Note: Job Errors are cleared with every subsequent full cache
     *
     * @apiSchema (Query) {jsonschema=../schema/req.query.ErrorList.json} apiParam
     * @apiSchema {jsonschema=../schema/res.ErrorList.json} apiSuccess
     */
    await schema.get('/job/error', {
        query: 'req.query.ErrorList.json',
        res: 'res.ErrorList.json'
    }, async (req, res) => {
        try {
            if (req.query.status) req.query.status = req.query.status.split(',');

            return res.json(await JobError.list(config.pool, req.query));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/job/error/count Job Error Count

     * @apiVersion 1.0.0
     * @apiName ErrorCount
     * @apiGroup JobError
     * @apiPermission public
     *
     * @apiDescription
     *     Return a simple count of the current number of job errors
     *
     * @apiSchema {jsonschema=../schema/res.ErrorCount.json} apiSuccess
     */
    await schema.get('/job/error/count', {
        res: 'res.ErrorCount.json'
    }, async (req, res) => {
        try {
            return res.json(await JobError.count(config.pool));
        } catch (err) {
            return Err.respond(err, res);
        }
    });


    /**
     * @api {get} /api/job/error/:job Get Job Error
     * @apiVersion 1.0.0
     * @apiName GetError
     * @apiGroup JobError
     * @apiPermission public
     *
     * @apiDescription
     *   Return a single job error if one exists or 404 if not
     *
     * @apiParam {Number} :job Job
     *
     * @apiSchema {jsonschema=../schema/res.JobError.json} apiSuccess
     */
    await schema.get('/job/error/:job', {
        ':job': 'integer',
        res: 'res.JobError.json'
    }, async (req, res) => {
        try {
            const joberror = await JobError.from(config.pool, req.params.job);
            return res.json(joberror.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/job/error Create Job Error
     * @apiVersion 1.0.0
     * @apiName ErrorCreate
     * @apiGroup JobError
     * @apiPermission admin
     *
     * @apiDescription
     *     Create a new Job Error in response to a live job that Failed or Warned
     *
     * @apiSchema (Body) {jsonschema=../schema/req.body.ErrorCreate.json} apiParam
     * @apiSchema {jsonschema=../schema/res.JobError.json} apiSuccess
     */
    await schema.post('/job/error', {
        body: 'req.body.ErrorCreate.json',
        res: 'res.JobError.json'
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            const joberror = await JobError.generate(config.pool, req.body);

            return res.json(joberror.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/job/error/:job Resolve Job Error
     * @apiVersion 1.0.0
     * @apiName ErrorModerate
     * @apiGroup JobError
     * @apiPermission admin
     *
     * @apiDescription
     *     Mark a job error as resolved
     *
     * @apiParam {Number} :job Job
     *
     * @apiSchema (Body) {jsonschema=../schema/res.ErrorModerate.json} apiParam
     * @apiSchema {jsonschema=../schema/res.ErrorModerate.json} apiSuccess
     */
    await schema.post('/job/error/:job', {
        ':job': 'integer',
        body: 'req.body.ErrorModerate.json',
        res: 'res.ErrorModerate.json'
    }, async (req, res) => {
        try {
            await Auth.is_flag(req, 'moderator');

            res.json(await JobError.moderate(config.pool, ci, req.params.job, req.body));
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
