'use strict';

const Err = require('../lib/error');

async function router(schema, config) {
    /**
     * @api {delete} /api/cache Flush Cache
     * @apiVersion 1.0.0
     * @apiName FlushCache
     * @apiGroup Cache
     * @apiPermission admin
     *
     * @apiDescription
     *   Flush the Memcached Cache
     *
     * @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
     */
    schema.delete('/cache', {
        res: 'res.Standard.json'
    }, async (req, res) => {
        try {
            await config.cacher.flush();

            res.json({
                status: 200,
                message: 'Cache Flushed'
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {delete} /api/cache/:cache_key Delete Key
     * @apiVersion 1.0.0
     * @apiName FlushCache
     * @apiGroup Cache
     * @apiPermission admin
     *
     * @apiDescription
     *   Flush the Memcached Cache
     *
     * @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
     */
    schema.delete('/cache/:cache_key', {
        res: 'res.Standard.json'
    }, async (req, res) => {
        try {
            await config.cacher.del(req.params.cache_key);

            res.json({
                status: 200,
                message: 'Key Flushed'
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}

module.exports = router;
