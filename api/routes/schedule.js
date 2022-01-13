'use strict';
const { Err } = require('@openaddresses/batch-schema');
const Schedule = require('../lib/schedule');

async function router(schema, config) {
    const user = new (require('../lib/user'))(config.pool);

    /**
     * @api {post} /api/schedule Scheduled Event
     * @apiVersion 1.0.0
     * @apiName Schedule
     * @apiGroup Schedule
     * @apiPermission admin
     *
     * @apiDescription
     *     Internal function to allow scheduled lambdas to kick off events
     *
     * @apiSchema (Body) {jsonschema=../schema/req.body.Schedule.json} apiParam
     * @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
     */
    await schema.post('/schedule', {
        body: 'req.body.Schedule.json',
        res: 'res.Standard.json'
    }, async (req, res) => {
        try {
            await user.is_admin(req);

            await Schedule.event(config.pool, req.body);

            return res.json({
                status: 200,
                message: 'Schedule Event Started'
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}

module.exports = router;
