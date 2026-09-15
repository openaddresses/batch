import Err from '@openaddresses/batch-error';
import { PatchUserBody } from './types.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { promisify } from 'util';
import moment from 'moment';
import { sql } from 'drizzle-orm';

const randomBytes = promisify(crypto.randomBytes);

/**
 * @class
 */
export default class User {
    /**
     * @constructor
     *
     * @param {Pool} pool PG Pool Instance
     */
    constructor(pool) {
        this.pool = pool;

        this.attrs = Object.keys(PatchUserBody.properties);
    }

    async verify(token) {
        if (!token) throw new Err(400, null, 'token required');

        let pgres;
        try {
            pgres = await this.pool.execute(sql`
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

        if (pgres.length !== 1) {
            throw new Err(401, null, 'Invalid or Expired Verify Token');
        }

        try {
            await this.pool.execute(sql`
                DELETE FROM users_reset
                    WHERE uid = ${pgres[0].uid}
            `);

            await this.pool.execute(sql`
                UPDATE users
                    SET validated = True
                    WHERE id = ${pgres[0].uid}
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
            pgres = await this.pool.execute(sql`
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

        if (pgres.length !== 1) {
            throw new Err(401, null, 'Invalid or Expired Reset Token');
        }

        const uid = pgres[0].uid;

        try {
            const userhash = await bcrypt.hash(user.password, 10);

            await this.pool.execute(sql`
                UPDATE users
                    SET
                        password = ${userhash},
                        validated = True
                    WHERE
                        id = ${uid}
            `);

            await this.pool.execute(sql`
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
            pgres = await this.pool.execute(sql`
                SELECT
                    id,
                    username,
                    email,
                    validated,
                    flags,
                    level,
                    access
                FROM
                    users
                WHERE
                    username = ${user}
                    OR email = ${user}
            `);
        } catch (err) {
            throw new Err(500, err, 'Internal User Error');
        }

        if (pgres.length !== 1) return;
        const u = pgres[0];

        if (action === 'verify' && u.validated) {
            throw new Err(400, null, 'User is already verified');
        }

        try {
            await this.pool.execute(sql`
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

            await this.pool.execute(sql`
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
                id: u.id,
                username: u.username,
                email: u.email,
                flags: u.flags,
                level: u.level,
                access: u.access,
                token: buffer.toString('hex')
            };
        } catch (err) {
            throw new Err(500, err, 'Internal User Error');
        }
    }

    async level(email, level, oc_contribution_id) {
        console.error(email, level);
        let pgres;
        try {
            if (oc_contribution_id === undefined) {
                pgres = await this.pool.execute(sql`
                    UPDATE users
                        SET
                            level = ${level}
                        WHERE
                            email = ${email}
                `);
            } else {
                pgres = await this.pool.execute(sql`
                    UPDATE users
                        SET
                            level = ${level},
                            oc_contribution_id = ${oc_contribution_id}
                        WHERE
                            email = ${email}
                `);
            }
        } catch (err) {
            throw new Err(500, err, 'Internal User Error');
        }

        return pgres.count > 0;
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
            pgres = await this.pool.execute(sql`
                UPDATE users
                    SET
                        flags = ${JSON.stringify(user.flags)},
                        access = ${user.access},
                        level = ${user.level},
                        oc_contribution_id = ${user.oc_contribution_id},
                        validated = ${user.validated}
                    WHERE
                        id = ${uid}
                    RETURNING *
            `);
        } catch (err) {
            throw new Err(500, err, 'Internal User Error');
        }

        // TODO Force relogin on account changes

        const row = pgres[0];

        return {
            id: row.id,
            level:  row.level,
            username: row.username,
            validated: row.validated,
            email: row.email,
            access: row.access,
            oc_contribution_id: row.oc_contribution_id,
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
     * @param {String} [query.validated=] - User Validated status to filter by
     * @param {String} [query.before=undefined] - Only show users before the given date
     * @param {String} [query.after=undefined] - Only show users after the given date
     */
    async list(query) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;
        if (!query.page) query.page = 0;
        if (!query.filter) query.filter = '';

        if (!query.access) query.access = null;
        if (!query.level) query.level = null;

        if (!query.validated) query.validated = null;

        if (!query.after) query.after = null;
        if (!query.before) query.before = null;

        if (query.after) {
            try {
                query.after = moment(query.after);
            } catch (err) {
                throw new Err(400, err, 'after param is not recognized as a valid date');
            }
        }

        if (query.before) {
            try {
                query.before = moment(query.before);
            } catch (err) {
                throw new Err(400, err, 'before param is not recognized as a valid date');
            }
        }


        let pgres;
        try {
            pgres = await this.pool.execute(sql`
                SELECT
                    count(*) OVER() AS count,
                    id,
                    username,
                    level,
                    access,
                    email,
                    flags,
                    validated,
                    oc_contribution_id
                FROM
                    users
                WHERE
                    (username ~* ${query.filter} OR email ~* ${query.filter})
                    AND (${query.access}::TEXT IS NULL OR access = ${query.access})
                    AND (${query.level}::TEXT IS NULL OR level = ${query.level})
                    AND (${query.validated}::BOOLEAN IS NULL OR validated = ${query.validated})
                    AND (${query.after ? query.after.toDate().toISOString() : null}::TIMESTAMP IS NULL OR created > ${query.after ? query.after.toDate().toISOString() : null}::TIMESTAMP)
                    AND (${query.before ? query.before.toDate().toISOString() : null}::TIMESTAMP IS NULL OR created < ${query.before ? query.before.toDate().toISOString() : null}::TIMESTAMP)
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
            total: pgres.length ? parseInt(pgres[0].count) : 0,
            users: pgres.map((row) => {
                return {
                    id: parseInt(row.id),
                    level: row.level,
                    username: row.username,
                    email: row.email,
                    access: row.access,
                    flags: row.flags,
                    validated: row.validated,
                    oc_contribution_id: row.oc_contribution_id
                };
            })
        };
    }

    async user(uid) {
        let pgres;
        try {
            pgres = await this.pool.execute(sql`
                SELECT
                    id,
                    level,
                    username,
                    access,
                    email,
                    flags,
                    oc_contribution_id
                FROM
                    users
                WHERE
                    id = ${uid}
            `);
        } catch (err) {
            throw new Err(500, err, 'Internal User Error');
        }

        if (pgres.length === 0) {
            throw new Error(404, null, 'Failed to retrieve user');
        }

        return {
            uid: parseInt(pgres[0].id),
            level: pgres[0].level,
            username: pgres[0].username,
            email: pgres[0].email,
            access: pgres[0].access,
            flags: pgres[0].flags,
            oc_contribution_id: pgres[0].oc_contribution_id
        };
    }

    async login(user) {
        if (!user.username) throw new Err(400, null, 'username required');
        if (!user.password) throw new Err(400, null, 'password required');

        if (user.username === 'internal') throw new Err(400, null, '"internal" is not a valid username');

        let pgres;
        try {
            pgres = await this.pool.execute(sql`
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

        if (pgres.length === 0) {
            throw new Err(403, null, 'Invalid Username or Pass');
        }

        if (!await bcrypt.compare(user.password, pgres[0].password)) {
            throw new Err(403, null, 'Invalid Username or Pass');
        }

        if (!pgres[0].validated) {
            throw new Err(403, null, 'User has not confirmed email');
        }

        if (pgres[0].access === 'disabled') {
            throw new Err(403, null, 'Account Disabled - Please Contact Us');
        }

        return {
            uid: parseInt(pgres[0].id),
            level: pgres[0].level,
            username: pgres[0].username,
            access: pgres[0].access,
            email: pgres[0].email,
            flags: pgres[0].flags
        };
    }

    async register(user) {
        if (!user.username) throw new Err(400, null, 'username required');
        if (!user.password) throw new Err(400, null, 'password required');
        if (!user.email) throw new Err(400, null, 'email required');

        if (user.username === 'internal') throw new Err(400, null, '"internal" is not a valid username');

        try {
            const uhash = await bcrypt.hash(user.password, 10);

            const pgres = await this.pool.execute(sql`
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

            const row = pgres[0];

            return {
                id: parseInt(row.id),
                username: row.username,
                email: row.email,
                access: row.access,
                level: row.level,
                flags: row.flags
            };
        } catch (err) {
            if (err.code === '23505' || (err.cause && err.cause.code === '23505')) {
                throw new Err(400, null, 'User already exists');
            }

            throw new Err(500, err, 'Failed to register user');
        }
    }
}
