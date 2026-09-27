import Err from '@openaddresses/batch-error';
import Email from '../lib/email.js';
import jwt from 'jsonwebtoken';
import User from '../lib/user.js';
import Level from '../lib/level.js';
import Schema from '@openaddresses/batch-schema';
import type Config from '../lib/config.js';
import {
    VerifyLoginQuery,
    StandardResponse,
    GetLoginQuery,
    LoginResponse,
    CreateLoginBody,
    ForgotLoginBody,
    ResetLoginBody,
} from '../lib/types.js';

export default async function router(schema: Schema, config: Config) {
    const email = new Email();
    const user = new User(config.pool);
    const level = new Level(config.pool);

    await schema.get('/login/verify', {
        name: 'Verify User',
        group: 'Login',
        description: 'Email Verification of new user',
        query: VerifyLoginQuery,
        res: StandardResponse,
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
        description: 'Return information about the currently logged in user',
        query: GetLoginQuery,
        res: LoginResponse,
    }, async (req, res) => {
        if (req.auth && req.auth.username) {
            try {
                if (req.query.level) {
                    try {
                        await level.single(String(req.auth.email));
                    } catch (err) {
                        console.error('Failed to refresh level from OpenCollective (non-fatal):', err);
                    }
                }
                res.json(await user.user(Number(req.auth.uid)));
            } catch (err) {
                return Err.respond(err, res);
            }
        } else {
            return res.status(403).json({
                status: 403,
                message: 'Invalid session',
            } as unknown as import('../lib/types.js').LoginResponseType);
        }
    });

    await schema.post('/login', {
        name: 'Create Session',
        group: 'Login',
        description: 'Log a user into the service and create an authenticated cookie',
        body: CreateLoginBody,
        res: LoginResponse,
    }, async (req, res) => {
        try {
            const auth = await user.login({
                username: req.body.username,
                password: req.body.password,
            });
            req.auth = auth;

            return res.json({
                uid: Number(auth.uid),
                level: auth.level,
                username: String(auth.username),
                email: String(auth.email),
                access: auth.access,
                flags: auth.flags,
                token: jwt.sign({
                    u: auth.uid,
                }, config.SharedSecret, {
                    expiresIn: '2 days',
                }),
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.post('/login/forgot', {
        name: 'Forgot Login',
        group: 'Login',
        description: 'If a user has forgotten their password, send them a password reset link to their email',
        body: ForgotLoginBody,
        res: StandardResponse,
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
        description: `
            Once a user has obtained a password reset by email via the Forgot Login API,
            use the token to reset the password
        `,
        body: ResetLoginBody,
        res: StandardResponse,
    }, async (req, res) => {
        try {
            return res.json(await user.reset({
                token: req.body.token,
                password: req.body.password,
            }));
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
