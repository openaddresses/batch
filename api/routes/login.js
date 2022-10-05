import Err from '@openaddresses/batch-error';
import Email from '../lib/email.js';
import jwt from 'jsonwebtoken';
import User from '../lib/user.js';
import Level from '../lib/level.js';

export default async function router(schema, config) {
    const email = new Email();
    const user = new User(config.pool);
    const level = new Level(config.pool);

    await schema.get('/login/verify', {
        name: 'Verify User',
        group: 'Login',
        auth: 'public',
        description: 'Email Verification of new user',
        query: 'req.query.VerifyLogin.json',
        res: 'res.Standard.json'
    }, async (req, res) => {
        try {
            res.json(await user.verify(req.query.token));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/login', {
        name: 'Session Info',
        group: 'Login',
        auth: 'user',
        description: 'Return information about the currently logged in user',
        query: 'req.query.GetLogin.json',
        res: 'res.Login.json'
    }, async (req, res) => {
        if (req.auth && req.auth.username) {
            try {
                if (req.query.level) await level.single(req.auth.email);
                res.json(await user.user(req.auth.uid));
            } catch (err) {
                return Err.respond(err, res);
            }
        } else {
            return res.status(403).json({
                status: 403,
                message: 'Invalid session'
            });
        }
    });

    await schema.post('/login', {
        name: 'Create Session',
        group: 'Login',
        auth: 'user',
        description: 'Log a user into the service and create an authenticated cookie',
        body: 'req.body.CreateLogin.json',
        res: 'res.Login.json'
    }, async (req, res) => {
        try {
            req.auth = await user.login({
                username: req.body.username,
                password: req.body.password
            });

            return res.json({
                uid: req.auth.uid,
                level: req.auth.level,
                username: req.auth.username,
                email: req.auth.email,
                access: req.auth.access,
                flags: req.auth.flags,
                token: jwt.sign({
                    u: req.auth.uid
                }, config.SharedSecret, {
                    expiresIn: '2 days'
                })
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.post('/login/forgot', {
        name: 'Forgot Login',
        group: 'Login',
        auth: 'public',
        description: 'If a user has forgotten their password, send them a password reset link to their email',
        body: 'req.body.ForgotLogin.json',
        res: 'res.Standard.json'
    }, async (req, res) => {
        try {
            const reset = await user.forgot(req.body.user); // Username or email

            if (config.args.email && reset) await email.forgot(reset);

            // To avoid email scraping - this will always return true, regardless of success
            return res.json({ status: 200, message: 'Password Email Sent' });
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.post('/login/reset', {
        name: 'Reset Login',
        group: 'Login',
        auth: 'public',
        description: `
            Once a user has obtained a password reset by email via the Forgot Login API,
            use the token to reset the password
        `,
        body: 'req.body.ResetLogin.json',
        res: 'res.Standard.json'
    }, async (req, res) => {
        try {
            return res.json(await user.reset({
                token: req.body.token,
                password: req.body.password
            }));
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
