'use strict';

const Err = require('./error');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

class Auth {
    constructor(pool, config) {
        this.pool = pool;
        this.config = config;
    }

    async is_auth(req) {
        if (!req.auth || !req.auth.access || !['session', 'token'].includes(req.auth.type)) {
            throw new Err(401, null, 'Authentication Required');
        }

        return true;
    }

    async is_admin(req) {
        if (!req.auth || !req.auth.access || req.auth.access !== 'admin') {
            throw new Err(401, null, 'Admin token required');
        }

        return true;
    }

    async login(user) {
        if (!user.username) throw new Err(400, null, 'username required');
        if (!user.password) throw new Err(400, null, 'password required');

        if (user.username === 'internal') throw new Err(400, null, '"internal" is not a valid username');

        let pgres;
        try {
            pgres = await this.pool.query(`
                SELECT
                    id,
                    username,
                    access,
                    email,
                    password
                FROM
                    users
                WHERE
                    username = $1 OR
                    email = $1;
            `, [
                user.username
            ]);
        } catch (err) {
            throw new Err(500, err, 'Internal Login Error');
        }

        if (pgres.rows.length === 0) {
            throw new Error(403, null, 'Invalid Username or Pass');
        }

        return new Promise((resolve, reject) => {
            bcrypt.compare(user.password, pgres.rows[0].password, (err, res) => {
                if (err) return reject(new Err(500, err, 'Internal Login Error'));
                if (!res) return reject(new Error(403, null, 'Invalid Username or Pass'));

                return resolve({
                    uid: pgres.rows[0].id,
                    username: pgres.rows[0].username,
                    access: pgres.rows[0].access,
                    email: pgres.rows[0].email
                });
            });
        });
    }

    async register(user) {
        if (!user.username) throw new Err(400, null, 'username required');
        if (!user.password) throw new Err(400, null, 'password required');
        if (!user.email) throw new Err(400, null, 'email required');

        if (user.username === 'internal') throw new Err(400, null, '"internal" is not a valid username');

        return new Promise((resolve, reject) => {
            bcrypt.hash(user.password, 10, (err, hash) => {
                if (err) return reject(new Err(500, err, 'Failed to hash password'));

                this.pool.query(`
                    INSERT INTO users (
                        username,
                        email,
                        password,
                        access
                    ) VALUES (
                        $1,
                        $2,
                        $3,
                        'user'
                    )
                `, [
                    user.username,
                    user.email,
                    hash
                ], (err) => {
                    if (err) return reject(new Err(500, err, 'Failed to create user'));

                    return resolve({
                        status: 200,
                        message: 'User Created'
                    });
                });
            });
        });
    }
}

class AuthToken {
    constructor(pool, config) {
        this.pool = pool;
        this.config = config;
    }

    async delete(auth, token_id) {
        try {
            await this.pool.query(`
                DELETE FROM
                    users_tokens
                WHERE
                    uid = $1
                    AND id = $2
            `, [
                auth.uid,
                token_id
            ]);

            return {
                status: 200,
                message: 'Token Deleted'
            };

        } catch (err) {
            throw new Err(500, err, 'Failed to delete token');
        }
    }

    async validate(token) {
        try {
            if (token.split('.').length !== 2 || token.split('.')[0] !== 'oa') {
                throw new Err(401, null, 'Invalid token');
            }

            const pgres = await this.pool.query(`
                SELECT
                    users.id AS uid,
                    users.username,
                    users.access,
                    users.email
                FROM
                    users INNER JOIN users_tokens
                        ON users_tokens.uid = users.id
                WHERE
                    users_tokens.token = $1
            `, [
                token
            ]);

            if (!pgres.rows.length) {
                throw new Err(401, null, 'Invalid token');
            } else if (pgres.rows.length > 1) {
                throw new Err(401, null, 'Token collision');
            }

            return pgres.rows[0];

        } catch (err) {
            throw new Err(500, err, 'Failed to validate token');
        }
    }

    async list(auth) {
        try {
            const pgres = await this.pool.query(`
                SELECT
                    id,
                    created
                FROM
                    users_tokens
                WHERE
                    uid = $1
            `, [
                auth.uid
            ]);

            return pgres.rows;
        } catch (err) {
            throw new Err(500, err, 'Failed to list tokens');
        }
    }

    async generate(auth) {
        if (auth.type !== 'session') {
            throw new Err(400, null, 'Only a user session can create a token');
        }

        try {
            const pgres = await this.pool.query(`
                INSERT INTO users_tokens (
                    token,
                    created,
                    uid
                ) VALUES (
                    $1,
                    NOW(),
                    $2
                ) RETURNING *
            `, [
                'oa.' + crypto.randomBytes(32).toString('hex'),
                auth.id
            ]);

            return {
                id: pgres.rows[0].id,
                token: pgres.rows[0].token,
                created: pgres.rows[0].created
            };
        } catch (err) {
            throw new Err(500, err, 'Failed to generate token');
        }
    }
}

module.exports = {
    Auth,
    AuthToken
};
