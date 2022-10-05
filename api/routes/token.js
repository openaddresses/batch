import Err from '@openaddresses/batch-error';
import Auth from '../lib/auth.js';
import Token from '../lib/token.js';

export default async function router(schema, config) {
    const token = new Token(config.pool);

    /**
     * @api {get} /api/token List Tokens
     * @apiVersion 1.0.0
     * @apiName ListTokens
     * @apiGroup Token
     * @apiPermission user
     *
     * @apiDescription
     *     List all tokens associated with the requester's account
     *
     * @apiSchema {jsonawait schema=./schema/res.ListTokens.json} apiSuccess
     */
    await schema.get('/token', {
        res: 'res.ListTokens.json'
    }, async (req, res) => {
        try {
            await Auth.is_auth(req);

            return res.json(await token.list(req.auth));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/token Create Token
     * @apiVersion 1.0.0
     * @apiName CreateToken
     * @apiGroup Token
     * @apiPermission user
     *
     * @apiDescription
     *     Create a new API token for programatic access
     *
     * @apiSchema (Body) {jsonawait schema=./schema/req.body.CreateToken.json} apiParam
     * @apiSchema {jsonawait schema=./schema/res.CreateToken.json} apiSuccess
     */
    await schema.post('/token', {
        body: 'req.body.CreateToken.json',
        res: 'res.CreateToken.json'
    }, async (req, res) => {
        try {
            await Auth.is_auth(req);

            return res.json(await token.generate(req.auth, req.body.name));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {delete} /api/token/:id Delete Token
     * @apiVersion 1.0.0
     * @apiName DeleteToken
     * @apiGroup Token
     * @apiPermission user
     *
     * @apiDescription
     *     Delete a user's API Token
     *
     * @apiParam {Number} id Token ID
     *
     * @apiSchema {jsonawait schema=./schema/res.Standard.json} apiSuccess
     */
    await schema.delete('/token/:id', {
        ':id': 'integer',
        res: 'res.Standard.json'
    }, async (req, res) => {
        try {
            await Auth.is_auth(req);

            return res.json(await token.delete(req.auth, req.params.id));
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
