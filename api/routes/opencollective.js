const Err = require('../lib/error');

async function router(schema) {
    /**
     * @api {post} /api/opencollective/event OpenCollective
     * @apiVersion 1.0.0
     * @apiName OpenCollective
     * @apiGroup Webhooks
     * @apiPermission admin
     *
     * @apiDescription
     *   Callback endpoint for OpenCollective. Should not be called by user functions
     */
    await schema.post('/opencollective/event', null, async (req, res) => {
        try {
            console.error(req.headers);
            console.error(req.body);

            res.status(200).send('Accepted but ignored');
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}

module.exports = router;
