'use strict';

const Err = require('../lib/error');
const Job = require('../lib/job');
const LevelOverride = require('../lib/level_override');
const { Param } = require('../lib/util');

async function router(schema, config) {
    const user = new (require('../lib/user'))(config.pool);

    /**
     * @api {post} /api/export Create Override
     * @apiVersion 1.0.0
     * @apiName CreateLevelOverride
     * @apiGroup LevelOverride
     * @apiPermission user
     *
     * @apiDescription
     *   Create a new level override
     *
     * @apiSchema (Body) {jsonawait schema=../schema/req.body.CreateLevelOverride.json} apiParam
     * @apiSchema {jsonawait schema=../schema/res.LevelOverride.json} apiSuccess
     */
    await schema.post('/level', {
        body: 'req.body.CreateLevelOverride.json',
        res: 'res.LevelOverride.json'
    }, async (req, res) => {
        try {
            await user.is_admin(req);

            const level = await LevelOverride.generate(config.pool, req.body)

            return res.json(level.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}

module.exports = router;
