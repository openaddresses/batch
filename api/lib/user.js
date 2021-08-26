'use strict';

const Err = require('./error');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { promisify } = require('util');
const randomBytes = promisify(crypto.randomBytes);
const { sql } = require('slonik');

class User {
    constructor(pool) {
        this.pool = pool;

        this.attrs = Object.keys(require('../schema/req.body.PatchUser.json').properties);
    }

    async is_auth(req) {
        if (!req.auth || !req.auth.access || !['session', 'token', 'secret'].includes(req.auth.type)) {
            throw new Err(401, null, 'Authentication Required');
        }

        if (req.auth.access === 'disabled') {
            throw new Err(403, null, 'Account Disabled - Please Contact Us');
        }

        return true;
    }

    async is_level(req, level) {
        await this.is_auth(req);

        if (level === 'basic') {
            return true;
        } else if (level === 'backer' && ['backer', 'sponsor'].includes(req.auth.level)) {
            return true;
        } else if (level === 'sponsor' && req.auth.level === 'sponsor') {
            return true;
        }

        throw new Err(401, null, 'Please donate to use this feature');
    }

    async is_flag(req, flag) {
        await this.is_auth(req);

        if ((!req.auth.flags || !req.auth.flags[flag]) && req.auth.access !== 'admin' && req.auth.type !== 'secret') {
            throw new Err(401, null, `${flag} flag required`);
        }

        return true;
    }

    async is_admin(req) {
        if (!req.auth || !req.auth.access || req.auth.access !== 'admin') {
            throw new Err(401, null, 'Admin token required');
        }

        return true;
    }


    async verify(token) {
        if (!token) throw new Err(400, null, 'token required');

        let pgres;
        try {
            pgres = await this.pool.query(sql`
                SELECT
                    uid
                FROM
                    users_reset
                WHERE
                    expires > NOW()
                    AND token = ${token}
                    AND action = 'verify'
            `);
        } catch (err) {
            throw new Err(500, err, 'User Verify Error');
        }

        if (pgres.rows.length !== 1) {
            throw new Err(401, null, 'Invalid or Expired Verify Token');
        }

        try {
            await this.pool.query(sql`
                DELETE FROM users_reset
                    WHERE uid = ${pgres.rows[0].uid}
            `);

            await this.pool.query(sql`
                UPDATE users
                    SET validated = True
                    WHERE id = ${pgres.rows[0].uid}
            `);

            return {
                status: 200,
                message: 'User Verified'
            };
        } catch (err) {
            throw new Err(500, err, 'Failed to verify user');
        }
    }

    async reset(user) {
        if (!user.token) throw new Err(400, null, 'token required');
        if (!user.password) throw new Err(400, null, 'password required');

        let pgres;
        try {
            pgres = await this.pool.query(sql`
                SELECT
                    uid
                FROM
                    users_reset
                WHERE
                    expires > NOW()
                    AND token = ${user.token}
                    AND action = 'reset'
            `);
        } catch (err) {
            throw new Err(500, err, 'User Reset Error');
        }

        if (pgres.rows.length !== 1) {
            throw new Err(401, null, 'Invalid or Expired Reset Token');
        }

        const uid = pgres.rows[0].uid;

        try {
            const userhash = await bcrypt.hash(user.password, 10);

            await this.pool.query(sql`
                UPDATE users
                    SET
                        password = ${userhash},
                        validated = True

                    WHERE
                        id = ${uid}
            `);

            await this.pool.query(sql`
                DELETE FROM users_reset
                    WHERE uid = ${uid}
            `);

            return {
                status: 200,
                message: 'User Reset'
            };
        } catch (err) {
            throw new Err(500, err, 'Failed to reset user\'s password');
        }
    }

    /**
     * Given a username or email, generate a password reset or validation email
     *
     * @param {string} user username or email to reset
     * @param {string} [action=reset] 'reset' or 'verify'
     */
    async forgot(user, action) {
        if (!user || !user.length) throw new Err(400, null, 'user must not be empty');
        if (!action) action = 'reset';

        let pgres;
        try {
            pgres = await this.pool.query(sql`
                SELECT
                    id,
                    username,
                    email
                FROM
                    users
                WHERE
                    username = ${user}
                    OR email = ${user}
            `);
        } catch (err) {
            throw new Err(500, err, 'Internal User Error');
        }

        if (pgres.rows.length !== 1) return;
        const u = pgres.rows[0];
        u.id = parseInt(u.id);

        try {
            await this.pool.query(sql`
                DELETE FROM
                    users_reset
                WHERE
                    uid = ${u.id}
                    AND action = ${action}
            `);
        } catch (err) {
            throw new Err(500, err, 'Internal User Error');
        }

        try {
            const buffer = await randomBytes(40);

            await this.pool.query(sql`
                INSERT INTO
                    users_reset (uid, expires, token, action)
                VALUES (
                    ${u.id},
                    NOW() + interval '1 hour',
                    ${buffer.toString('hex')},
                    ${action}
                )
            `);

            return {
                uid: u.id,
                username: u.username,
                email: u.email,
                token: buffer.toString('hex')
            };
        } catch (err) {
            throw new Err(500, err, 'Internal User Error');
        }
    }

    async level(email, level) {
        let pgres;
        try {
            pgres = await this.pool.query(sql`
                UPDATE users
                    SET
                        level = ${level}
                    WHERE
                        email = ${email}
            `);
        } catch (err) {
            throw new Err(500, err, 'Internal User Error');
        }

        return !!pgres.rows.length;
    }

    async patch(uid, patch) {
        const user = await this.user(uid);

        for (const attr of this.attrs) {
            if (patch[attr] !== undefined) {
                user[attr] = patch[attr];
            }
        }

        let pgres;
        try {
            pgres = await this.pool.query(sql`
                UPDATE users
                    SET
                        flags = ${user.flags},
                        access = ${user.access}}
                    WHERE
                        id = ${uid}
                    RETURNING *
            `);
        } catch (err) {
            throw new Err(500, err, 'Internal User Error');
        }

        try {
            // Force relogin on account changes
            await this.pool.query(sql`
                DELETE FROM
                    session
                WHERE
                    (sess->'auth'->>'uid')::BIGINT = ${uid}
            `);
        } catch (err) {
            throw new Err(500, err, 'Failed to reset sessions');
        }

        const row = pgres.rows[0];

        return {
            id: parseInt(row.id),
            level:  row.level,
            username: row.username,
            email: row.email,
            access: row.access,
            flags: row.flags
        };
    }

    /**
     * Return a list of users
     *
     * @param {Object} query - Query Object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.page=0] - Page of users to return
     * @param {String} [query.filter=] - Username or Email fragment to filter by
     * @param {String} [query.level=] - Donor level to filter by
     * @param {String} [query.access=] - User Access to filter by
     */
    async list(query) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;
        if (!query.page) query.page = 0;
        if (!query.filter) query.filter = '';

        if (!query.access) query.access = null;
        if (!query.level) query.level = null;

        let pgres;
        try {
            pgres = await this.pool.query(sql`
                SELECT
                    count(*) OVER() AS count,
                    id,
                    username,
                    level,
                    access,
                    email,
                    flags
                FROM
                    users
                WHERE
                    (username ~ ${query.filter} OR email ~ ${query.filter})
                    AND (${query.access}::TEXT IS NOT NULL OR access = ${query.access})
                    AND (${query.level}::TEXT IS NOT NULL OR level = ${query.level})
                ORDER BY
                    created DESC
                LIMIT
                    ${query.limit}
                OFFSET
                    ${query.page * query.limit}

            `);
        } catch (err) {
            throw new Err(500, err, 'Internal User Error');
        }

        return {
            total: pgres.rows.length ? parseInt(pgres.rows[0].count) : 0,
            users: pgres.rows.map((row) => {
                return {
                    id: parseInt(row.id),
                    level: row.level,
                    username: row.username,
                    email: row.email,
                    access: row.access,
                    flags: row.flags
                };
            })
        };
    }

    async user(uid) {
        let pgres;
        try {
            pgres = await this.pool.query(sql`
                SELECT
                    id,
                    level,
                    username,
                    access,
                    email,
                    flags
                FROM
                    users
                WHERE
                    id = ${uid}
            `);
        } catch (err) {
            throw new Err(500, err, 'Internal User Error');
        }

        if (pgres.rows.length === 0) {
            throw new Error(404, null, 'Failed to retrieve user');
        }

        return {
            uid: parseInt(pgres.rows[0].id),
            level: pgres.rows[0].level,
            username: pgres.rows[0].username,
            email: pgres.rows[0].email,
            access: pgres.rows[0].access,
            flags: pgres.rows[0].flags
        };
    }

    async login(user) {
        if (!user.username) throw new Err(400, null, 'username required');
        if (!user.password) throw new Err(400, null, 'password required');

        if (user.username === 'internal') throw new Err(400, null, '"internal" is not a valid username');

        let pgres;
        try {
            pgres = await this.pool.query(sql`
                SELECT
                    id,
                    username,
                    level,
                    access,
                    email,
                    password,
                    flags,
                    validated
                FROM
                    users
                WHERE
                    username = ${user.username} OR
                    email = ${user.username}
            `);
        } catch (err) {
            throw new Err(500, err, 'Internal Login Error');
        }

        if (pgres.rows.length === 0) {
            throw new Err(403, null, 'Invalid Username or Pass');
        }

        if (!await bcrypt.compare(user.password, pgres.rows[0].password)) {
            throw new Err(403, null, 'Invalid Username or Pass');
        }

        if (!pgres.rows[0].validated) {
            throw new Err(403, null, 'User has not confirmed email');
        }

        if (pgres.rows[0].access === 'disabled') {
            throw new Err(403, null, 'Account Disabled - Please Contact Us');
        }

        return {
            uid: parseInt(pgres.rows[0].id),
            level: pgres.rows[0].level,
            username: pgres.rows[0].username,
            access: pgres.rows[0].access,
            email: pgres.rows[0].email,
            flags: pgres.rows[0].flags
        };
    }

    async register(user) {
        if (!user.username) throw new Err(400, null, 'username required');
        if (!user.password) throw new Err(400, null, 'password required');
        if (!user.email) throw new Err(400, null, 'email required');

        if (user.username === 'internal') throw new Err(400, null, '"internal" is not a valid username');

        try {
            const uhash = await bcrypt.hash(user.password, 10);

            const pgres = await this.pool.query(sql`
                INSERT INTO users (
                    username,
                    email,
                    password,
                    access,
                    flags
                ) VALUES (
                    ${user.username},
                    ${user.email},
                    ${uhash},
                    'user',
                    '{}'::JSONB
                ) RETURNING *
            `);

            const row = pgres.rows[0];

            return {
                id: parseInt(row.id),
                username: row.username,
                email: row.email,
                access: row.access,
                flags: row.flags
            };
        } catch (err) {
            if (err.code && err.code === '23505') {
                throw new Err(400, null, 'User already exists');
            }

            throw new Err(500, err, 'Failed to register user');
        }
    }
}

module.exports = User;
