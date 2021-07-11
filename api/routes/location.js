'use strict';

const Err = require('../lib/error');

async function router(router, schemas, config) {
    /**
     * @api {get} /api/projects Public Projects
     * @apiVersion 1.0.0
     * @apiName ListPublicProjects
     * @apiGroup Project
     * @apiPermission public
     *
     * @apiDescription
     *     List all public projects
     *
     * @apiSchema (Query) {jsonschema=../schema/req.query.ListProjects.json} apiParam
     * @apiSchema {jsonschema=../schema/res.ListProjects.json} apiSuccess
    router.get(
        ...await schemas.get('GET /projects', {
            query: 'req.query.ListProjects.json',
            res: 'res.ListProjects.json'
        }),
        async (req, res) => {
            try {
                req.query.public = true;
                res.json(await Project.list(config.pool, req.query));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );
     */
}

module.exports = router;
