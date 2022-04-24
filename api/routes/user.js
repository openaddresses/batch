import { Err } from '@openaddresses/batch-schema';
import Email from '../lib/email.js';
import User from '../lib/user.js';
import Level from '../lib/level.js';

export default async function router(schema, config) {
    const email = new Email();
    const user = new User(config.pool);
    const level = new Level(config.pool);

    /**
     * @api {get} /api/user List Users
     * @apiVersion 1.0.0
     * @apiName ListUsers
     * @apiGroup User
     * @apiPermission admin
     *
     * @apiDescription
     *     Return a list of users that have registered with the service
     *
     * @apiSchema (Query) {jsonawait schema=./schema/req.query.ListUsers.json} apiParam
     * @apiSchema {jsonawait schema=./schema/res.ListUsers.json} apiSuccess
     */
    await schema.get('/user', {
        res: 'res.ListUsers.json'
    }, async (req, res) => {
        try {
            await user.is_admin(req);

            res.json(await user.list(req.query));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/user Create User
     * @apiVersion 1.0.0
     * @apiName CreateUser
     * @apiGroup User
     * @apiPermission public
     *
     * @apiDescription
     *     Create a new user
     *
     * @apiSchema (Body) {jsonawait schema=./schema/req.body.CreateUser.json} apiParam
     * @apiSchema {jsonawait schema=./schema/res.User.json} apiSuccess
     */
    await schema.post('/user', {
        body: 'req.body.CreateUser.json',
        res: 'res.User.json'
    }, async (req, res) => {
        try {
            if (req.body.password) {
                await user.register(req.body);
            }

            const forgot = await user.forgot(req.body.username, 'verify');

            if (config.args.email) await email.verify({
                username: forgot.username,
                email: forgot.email,
                token: forgot.token
            });

            delete forgot.token;
            res.json(forgot);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/user/:id Single User
     * @apiVersion 1.0.0
     * @apiName SingleUser
     * @apiGroup User
     * @apiPermission admin
     *
     * @apiDescription
     *     Get all info about a single user
     *
     * @apiParam {Number} :id User ID
     *
     * @apiSchema (Query) {jsonawait schema=./schema/req.query.SingleUser.json} apiParam
     * @apiSchema {jsonawait schema=./schema/res.User.json} apiSuccess
     */
    await schema.get('/user/:id', {
        ':id': 'integer',
        query: 'req.query.SingleUser.json',
        res: 'res.User.json'
    }, async (req, res) => {
        try {
            await user.is_admin(req);

            if (req.query.level) {
                const usr = await user.user(req.params.id);
                await level.single(usr.email);
            }

            res.json(await user.user(req.params.id));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {patch} /api/user/:id Update User
     * @apiVersion 1.0.0
     * @apiName PatchUser
     * @apiGroup User
     * @apiPermission admin
     *
     * @apiDescription
     *     Update information about a given user
     *
     * @apiParam {Number} :id User ID
     *
     * @apiSchema (Body) {jsonawait schema=./schema/req.body.PatchUser.json} apiParam
     * @apiSchema {jsonawait schema=./schema/res.User.json} apiSuccess
     */
    await schema.patch('/user/:id', {
        ':id': 'integer',
        body: 'req.body.PatchUser.json',
        res: 'res.User.json'
    }, async (req, res) => {
        try {
            await user.is_admin(req);

            res.json(await user.patch(req.params.id, req.body));
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
