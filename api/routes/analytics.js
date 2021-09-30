const Err = require('../lib/error');
const Analytics = require('../lib/analytics');

async function router(schema, config) {
    const user = new (require('../lib/user'))(config.pool);
    const analytics = new Analytics(config.pool);

    /**
     * @api {get} /api/dash/traffic Session Counts
     * @apiVersion 1.0.0
     * @apiName TrafficAnalytics
     * @apiGroup Analytics
     * @apiPermission admin
     *
     * @apiDescription
     *   Report anonymized traffic data about the number of user sessions created in a given day.
     *
     * @apiSchema {jsonawait schema=./schema/res.TrafficAnalytics.json} apiSuccess
     */
    await schema.get('/dash/traffic', {
        res: 'res.TrafficAnalytics.json'
    }, async (req, res) => {
        try {
            await user.is_admin(req);

            res.json(await analytics.traffic());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/dash/collections Collection Counts
     * @apiVersion 1.0.0
     * @apiName CollectionsAnalytics
     * @apiGroup Analytics
     * @apiPermission admin
     *
     * @apiDescription
     *   Report anonymized traffic data about the number of collection downloads.
     *
     * @apiSchema {jsonawait schema=./schema/res.CollectionsAnalytics.json} apiSuccess
     */
    await schema.get('/dash/collections', {
        res: 'res.CollectionsAnalytics.json'
    }, async (req, res) => {
        try {
            await user.is_admin(req);

            res.json(await analytics.collections());
        } catch (err) {
            return Err.respond(err, res);
        }
    });


}

module.exports = router;
