const fs = require('fs');
const jwt = require('jsonwebtoken');
const Cacher = require('./lib/cacher');
const { ValidationError } = require('express-json-validator-middleware');
const Analytics = require('./lib/analytics');
const path = require('path');
const morgan = require('morgan');
const util = require('./lib/util');
const express = require('express');
const pkg = require('./package.json');
const minify = require('express-minify');
const bodyparser = require('body-parser');
const TileBase = require('tilebase');
const Schema = require('./lib/schema');
const { sql, createPool } = require('slonik');
const args = require('minimist')(process.argv, {
    boolean: ['help', 'populate', 'email', 'no-cache', 'no-tilebase'],
    alias: {
        no_tb: 'no-tilebase',
        no_c: 'no-cache'
    },
    string: ['postgres']
});

const Err = require('./lib/error');

const Param = util.Param;

const Config = require('./lib/config');

if (require.main === module) {
    configure(args);
}

async function configure(args, cb) {
    try {
        return server(args, await Config.env(args), cb);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

/**
 * @apiDefine admin Admin
 *   The user must be an admin to use this endpoint
 */
/**
 * @apiDefine upload Upload
 *   The user must be an admin or have the "upload" flag enabled on their account
 */
/**
 * @apiDefine user User
 *   A user must be logged in to use this endpoint
 */
/**
 * @apiDefine public Public
 *   This API endpoint does not require authentication
 */

async function server(args, config, cb) {
    let tb = false;
    if (!args['no-tilebase']) {
        console.log(`ok - loading: s3://${config.Bucket}/${config.StackName}/fabric.tilebase`);
        tb = new TileBase(`s3://${config.Bucket}/${config.StackName}/fabric.tilebase`);
        console.log('ok - loaded TileBase');
        await tb.open();
    } else {
        console.log('ok - TileBase Disabled');
    }

    let postgres = process.env.POSTGRES;

    if (args.postgres) {
        postgres = args.postgres;
    } else if (!postgres) {
        postgres = 'postgres://postgres@localhost:5432/openaddresses';
    }

    let pool = false;
    let retry = 5;
    do {
        try {
            pool = createPool(postgres);

            await pool.query(sql`SELECT NOW()`);
        } catch (err) {
            pool = false;

            if (retry === 0) {
                console.error('not ok - terminating due to lack of postgres connection');
                return process.exit(1);
            }

            retry--;
            console.error('not ok - unable to get postgres connection');
            console.error(`ok - retrying... (${5 - retry}/5)`);
            await sleep(5000);
        }
    } while (!pool);

    const analytics = new Analytics(pool);
    const level = new (require('./lib/level'))(pool);

    config.cacher = new Cacher(args['no-cache']);
    config.pool = pool;
    config.tb = tb;

    try {
        if (args.populate) {
            await Map.populate(pool);
        }
    } catch (err) {
        throw new Error(err);
    }

    const user = new (require('./lib/user'))(pool);
    const email = new (require('./lib/email'))();
    const token = new (require('./lib/token'))(pool);

    const app = express();

    const schema = new Schema(express.Router());

    app.disable('x-powered-by');
    app.use(minify());

    app.use(analytics.middleware());
    app.use(express.static('web/dist'));

    /**
     * @api {get} /api Get Metadata
     * @apiVersion 1.0.0
     * @apiName Meta
     * @apiGroup Server
     * @apiPermission public
     *
     * @apiDescription
     *     Return basic metadata about server configuration
     *
     * @apiSchema {jsonschema=./schema/res.Meta.json} apiSuccess
     */
    app.get('/api', (req, res) => {
        return res.json({
            version: pkg.version
        });
    });

    /**
     * @api {get} /health Server Healthcheck
     * @apiVersion 1.0.0
     * @apiName Health
     * @apiGroup Server
     * @apiPermission public
     *
     * @apiDescription
     *     AWS ELB Healthcheck for the server
     *
     * @apiSchema {jsonschema=./schema/res.Health.json} apiSuccess
     */
    app.get('/health', (req, res) => {
        return res.json({
            healthy: true,
            message: 'I work all day, I work all night to get the open the data!'
        });
    });

    app.use('/api', schema.router);
    app.use('/docs', express.static('./doc'));
    app.use('/*', express.static('web/dist'));

    schema.router.use(bodyparser.urlencoded({ extended: true }));
    schema.router.use(morgan('combined'));
    schema.router.use(bodyparser.json({
        limit: '50mb'
    }));

    // Unified Auth
    schema.router.use(async (req, res, next) => {
        if (req.header('shared-secret')) {
            if (req.header('shared-secret') !== config.SharedSecret) {
                return res.status(401).json({
                    status: 401,
                    message: 'Invalid shared secret'
                });
            } else {
                req.auth = {
                    uid: false,
                    type: 'secret',
                    level: 'sponsor',
                    username: false,
                    access: 'admin',
                    email: false,
                    flags: {}
                };
            }
        } else if (req.header('authorization')) {
            const authorization = req.header('authorization').split(' ');
            if (authorization[0].toLowerCase() !== 'bearer') {
                return res.status(401).json({
                    status: 401,
                    message: 'Only "Bearer" authorization header is allowed'
                });
            }

            if (authorization[1].split('.')[0] === 'oa') {
                try {
                    req.auth = await token.validate(authorization[1]);
                    req.auth.type = 'token';
                } catch (err) {
                    return Err.respond(err, res);
                }
            } else {
                try {
                    const decoded = jwt.verify(authorization[1], config.SharedSecret);
                    req.auth = await user.user(decoded.u);
                    req.auth.type = 'session';
                } catch (err) {
                    return res.status(401).json({
                        status: 401,
                        message: err.message
                    });
                }
            }
        } else if (req.query.token) {
            try {
                const decoded = jwt.verify(req.query.token, config.SharedSecret);
                req.token = await user.user(decoded.u);
                req.token.type = 'token';
            } catch (err) {
                // Login/Verify uses non-jwt token
            }
        } else {
            req.auth = false;
        }

        return next();
    });

    // Load dynamic routes directory
    for (const r of fs.readdirSync(path.resolve(__dirname, './routes'))) {
        if (!config.silent) console.error(`ok - loaded routes/${r}`);
        await require('./routes/' + r)(schema, config);
    }

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
            const usr = await user.register(req.body);

            const forgot = await user.forgot(usr.username, 'verify');

            if (args.email) await email.verify({
                username: usr.username,
                email: usr.email,
                token: forgot.token
            });

            res.json(usr);
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
     * @apiParam {Number} :id The UID of the user to update
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
            await Param.int(req, 'id');
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
     * @apiParam {Number} :id The UID of the user to update
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
            await Param.int(req, 'id');
            await user.is_admin(req);

            res.json(await user.patch(req.params.id, req.body));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/login/verify Verify User
     * @apiVersion 1.0.0
     * @apiName VerifyLogin
     * @apiGroup Login
     * @apiPermission public
     *
     * @apiDescription
     *     Email Verification of new user
     *
     * @apiSchema {jsonawait schema=./schema/res.Standard.json} apiSuccess
     */
    await schema.get('/login/verify', {
        query: 'req.query.VerifyLogin.json',
        res: 'res.Standard.json'
    }, async (req, res) => {
        try {
            res.json(await user.verify(req.query.token));
        } catch (err) {
            return Err.respond(err, res);
        }
    });


    /**
     * @api {get} /api/login Session Info
     * @apiVersion 1.0.0
     * @apiName GetLogin
     * @apiGroup Login
     * @apiPermission user
     *
     * @apiDescription
     *     Return information about the currently logged in user
     *
     * @apiSchema (Query) {jsonawait schema=./schema/req.query.GetLogin.json} apiParam
     * @apiSchema {jsonawait schema=./schema/res.Login.json} apiSuccess
     */
    await schema.get('/login', {
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

    /**
     * @api {post} /api/login Create Session
     * @apiVersion 1.0.0
     * @apiName CreateLogin
     * @apiGroup Login
     * @apiPermission user
     *
     * @apiDescription
     *     Log a user into the service and create an authenticated cookie
     *
     * @apiSchema (Body) {jsonawait schema=./schema/req.body.CreateLogin.json} apiParam
     * @apiSchema {jsonawait schema=./schema/res.Login.json} apiSuccess
     */
    await schema.post('/login', {
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

    /**
     * @api {post} /api/login/forgot Forgot Login
     * @apiVersion 1.0.0
     * @apiName ForgotLogin
     * @apiGroup Login
     * @apiPermission public
     *
     * @apiDescription
     *     If a user has forgotten their password, send them a password reset link to their email
     *
     * @apiSchema (Body) {jsonawait schema=./schema/req.body.ForgotLogin.json} apiParam
     * @apiSchema {jsonawait schema=./schema/res.Standard.json} apiSuccess
     */
    await schema.post('/login/forgot', {
        body: 'req.body.ForgotLogin.json',
        res: 'res.Standard.json'
    }, async (req, res) => {
        try {
            const reset = await user.forgot(req.body.user); // Username or email

            if (args.email && reset) await email.forgot(reset);

            // To avoid email scraping - this will always return true, regardless of success
            return res.json({ status: 200, message: 'Password Email Sent' });
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/login/reset Reset Login
     * @apiVersion 1.0.0
     * @apiName ResetLogin
     * @apiGroup Login
     * @apiPermission public
     *
     * @apiDescription
     *     Once a user has obtained a password reset by email via the Forgot Login API,
     *     use the token to reset the password
     *
     * @apiSchema (Body) {jsonawait schema=./schema/req.body.ResetLogin.json} apiParam
     * @apiSchema {jsonawait schema=./schema/res.Standard.json} apiSuccess
     */
    await schema.post('/login/reset', {
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
            await user.is_auth(req);

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
            await user.is_auth(req);

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
     * @apiSchema {jsonawait schema=./schema/res.Standard.json} apiSuccess
     */
    await schema.delete('/token/:id', {
        ':id': 'integer',
        res: 'res.Standard.json'
    }, async (req, res) => {
        try {
            await Param.int(req, 'id');

            await user.is_auth(req);

            return res.json(await token.delete(req.auth, req.params.id));
        } catch (err) {
            return Err.respond(err, res);
        }
    }
    );

    schema.router.use((err, req, res, next) => {
        if (err instanceof ValidationError) {
            let errs = [];

            if (err.validationErrors.body) {
                errs = errs.concat(err.validationErrors.body.map((e) => {
                    return { message: e.message };
                }));
            }

            if (err.validationErrors.query) {
                errs = errs.concat(err.validationErrors.query.map((e) => {
                    return { message: e.message };
                }));
            }

            return Err.respond(
                new Err(400, null, 'validation error'),
                res,
                errs
            );
        } else {
            next(err);
        }
    });

    schema.router.all('*', (req, res) => {
        return res.status(404).json({
            status: 404,
            message: 'API endpoint does not exist!'
        });
    });

    const srv = app.listen(4999, (err) => {
        if (err) return err;

        if (cb) return cb(srv, config);

        console.log('ok - http://localhost:4999');
    });
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

module.exports = configure;
