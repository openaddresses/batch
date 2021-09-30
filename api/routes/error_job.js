const Err = require('../lib/error');
const JobError = require('../lib/joberror');
const { Param } = require('../lib/util');

async function router(schema, config) {
    const user = new (require('../lib/user'))(config.pool);
    const ci = new (require('../lib/ci'))(config);

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
     * @apiSchema {jsonschema=../schema/res.ErrorList.json} apiSuccess
     */
    await schema.get('/job/error', {
        res: 'res.ErrorList.json'
    }, async (req, res) => {
        try {
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
     * @apiName ErrorList
     * @apiGroup ErrorSingle
     * @apiPermission public
     *
     * @apiDescription
     *   Return a single job error if one exists or 404 if not
     *
     * @apiSchema {jsonschema=../schema/res.ErrorSingle.json} apiSuccess
     */
    await schema.get('/job/error/:job', {
        res: 'res.ErrorSingle.json'
    }, async (req, res) => {
        try {
            await Param.int(req, 'job');

            return res.json(await JobError.get(config.pool, req.params.job));
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
     * @apiParam {Number} job Job ID of the given error
     * @apiParam {String} message Text representation of the error
     *
     * @apiSchema (Body) {jsonschema=../schema/req.body.ErrorCreate.json} apiParam
     * @apiSchema {jsonschema=../schema/res.ErrorCreate.json} apiSuccess
     */
    await schema.post('/job/error', {
        body: 'req.body.ErrorCreate.json',
        res: 'res.ErrorCreate.json'
    }, async (req, res) => {
        try {
            await user.is_admin(req);

            const joberror = new JobError(req.body.job, req.body.message);
            return res.json(await joberror.generate(config.pool));
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
     * @apiParam {Number} :job Job ID
     *
     * @apiSchema (Body) {jsonschema=../schema/res.ErrorModerate.json} apiParam
     * @apiSchema {jsonschema=../schema/res.ErrorModerate.json} apiSuccess
     */
    await schema.post('/job/error/:job', {
        body: 'req.body.ErrorModerate.json',
        res: 'res.ErrorModerate.json'
    }, async (req, res) => {
        try {
            await Param.int(req, 'job');

            await user.is_flag(req, 'moderator');

            res.json(await JobError.moderate(config.pool, ci, req.params.job, req.body));
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}

module.exports = router;
