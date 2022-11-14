import Err from '@openaddresses/batch-error';
import Email from '../lib/email.js';
import User from '../lib/user.js';
import Auth from '../lib/auth.js';
import Level from '../lib/level.js';

export default async function router(schema, config) {
    const email = new Email();
    const user = new User(config.pool);
    const level = new Level(config.pool);

    await schema.get('/user', {
        name: 'List Users',
        group: 'User',
        auth: 'admin',
        description: 'Return a list of users that have registered with the service',
        res: 'res.ListUsers.json'
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            res.json(await user.list(req.query));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.post('/user', {
        name: 'Create User',
        group: 'User',
        auth: 'public',
        description: 'Create a new user',
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

    await schema.get('/user/:id', {
        name: 'Single User',
        group: 'User',
        auth: 'admin',
        description: 'Get all info about a given user',
        ':id': 'integer',
        query: 'req.query.SingleUser.json',
        res: 'res.User.json'
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            if (req.query.level) {
                const usr = await user.user(req.params.id);
                await level.single(usr.email);
            }

            res.json(await user.user(req.params.id));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.patch('/user/:id', {
        name: 'Update User',
        group: 'User',
        auth: 'admin',
        description: 'Update a user',
        ':id': 'integer',
        body: 'req.body.PatchUser.json',
        res: 'res.User.json'
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            res.json(await user.patch(req.params.id, req.body));
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
