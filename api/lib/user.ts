import Err from '@openaddresses/batch-error';
import { PatchUserBody } from './types.js';
import type {
    StandardResponseType,
    ListUsersResponseType,
    ListUsersQueryType,
    PatchUserBodyType,
    UserResponseType,
} from './types.js';
import type { AuthType } from './auth.js';
import type { Pool } from '@openaddresses/batch-generic';
import type * as pgschema from './schema.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { promisify } from 'util';
import moment from 'moment';
import { sql } from 'drizzle-orm';

const randomBytes = promisify(crypto.randomBytes);

export interface UserProfile {
    uid: number;
    type?: AuthType;
    level: string;
    username: string;
    email: string;
    access: string;
    flags: Record<string, boolean>;
}

export interface UserForgotResult {
    id: number;
    username: string;
    email: string;
    flags: Record<string, boolean>;
    level: string;
    access: string;
    token: string;
}

export interface UserRegisterResult {
    id: number;
    username: string;
    email: string;
    access: string;
    level: string;
    flags: Record<string, boolean>;
}

/**
 * @class
 */
export default class User {
    pool: Pool<typeof pgschema>;
    attrs: string[];

    constructor(pool: Pool<typeof pgschema>) {
        this.pool = pool;

        this.attrs = Object.keys(PatchUserBody.properties);
    }

    async verify(token: string): Promise<StandardResponseType> {
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
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'User Verify Error');
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
                message: 'User Verified',
            };
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Failed to verify user');
        }
    }

    async reset(user: { token?: string; password?: string }): Promise<StandardResponseType> {
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
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'User Reset Error');
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
                message: 'User Reset',
            };
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Failed to reset user\'s password');
        }
    }

    /**
     * Given a username or email, generate a password reset or validation email
     *
     * @param user   username or email to reset
     * @param action 'reset' or 'verify'
     */
    async forgot(user: string, action?: string): Promise<UserForgotResult | undefined> {
        if (!user || !user.length) throw new Err(400, null, 'user must not be empty');
        if (!action) action = 'reset';

        let pgres;
        try {
            pgres = await this.pool.execute<{
                id: number;
                username: string;
                email: string;
                validated: boolean;
                flags: Record<string, boolean>;
                level: string;
                access: string;
            }>(sql`
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
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Internal User Error');
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
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Internal User Error');
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
                token: buffer.toString('hex'),
            };
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Internal User Error');
        }
    }

    async level(email: string, level: string): Promise<boolean> {
        console.error(email, level);
        let pgres;
        try {
            pgres = await this.pool.execute(sql`
                UPDATE users
                    SET
                        level = ${level}
                    WHERE
                        email = ${email}
            `);
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Internal User Error');
        }

        return pgres.count > 0;
    }

    async patch(uid: number, patch: PatchUserBodyType): Promise<UserResponseType & { validated: boolean }> {
        const base = await this.user(uid);
        const user: Record<string, unknown> = { ...base };

        for (const attr of this.attrs) {
            const value = (patch as Record<string, unknown>)[attr];
            if (value !== undefined) {
                user[attr] = value;
            }
        }

        let pgres;
        try {
            pgres = await this.pool.execute<{
                id: string;
                level: string;
                username: string;
                validated: boolean;
                email: string;
                access: string;
                flags: Record<string, boolean>;
            }>(sql`
                UPDATE users
                    SET
                        flags = ${JSON.stringify(user.flags)},
                        access = ${user.access},
                        validated = ${user.validated}
                    WHERE
                        id = ${uid}
                    RETURNING *
            `);
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Internal User Error');
        }

        // TODO Force relogin on account changes

        const row = pgres[0];

        return {
            id: parseInt(row.id),
            level: row.level,
            username: row.username,
            validated: row.validated,
            email: row.email,
            access: row.access,
            flags: row.flags,
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
    async list(query: Partial<ListUsersQueryType> = {}): Promise<ListUsersResponseType> {
        const limit = query.limit ?? 100;
        const page = query.page ?? 0;
        const filter = query.filter ?? '';
        const access = query.access ?? null;
        const level = query.level ?? null;
        const validated = query.validated ?? null;

        let after: moment.Moment | null = null;
        let before: moment.Moment | null = null;

        if (query.after) {
            try {
                after = moment(query.after);
            } catch (err) {
                throw new Err(400, err instanceof Error ? err : new Error(String(err)), 'after param is not recognized as a valid date');
            }
        }

        if (query.before) {
            try {
                before = moment(query.before);
            } catch (err) {
                throw new Err(400, err instanceof Error ? err : new Error(String(err)), 'before param is not recognized as a valid date');
            }
        }

        let pgres;
        try {
            pgres = await this.pool.execute<{
                count: string;
                id: string;
                username: string;
                level: string;
                access: string;
                email: string;
                flags: Record<string, boolean>;
                validated: boolean;
            }>(sql`
                SELECT
                    count(*) OVER() AS count,
                    id,
                    username,
                    level,
                    access,
                    email,
                    flags,
                    validated
                FROM
                    users
                WHERE
                    (username ~* ${filter} OR email ~* ${filter})
                    AND (${access}::TEXT IS NULL OR access = ${access})
                    AND (${level}::TEXT IS NULL OR level = ${level})
                    AND (${validated}::BOOLEAN IS NULL OR validated = ${validated})
                    AND (${after ? after.toDate().toISOString() : null}::TIMESTAMP IS NULL OR created > ${after ? after.toDate().toISOString() : null}::TIMESTAMP)
                    AND (${before ? before.toDate().toISOString() : null}::TIMESTAMP IS NULL OR created < ${before ? before.toDate().toISOString() : null}::TIMESTAMP)
                ORDER BY
                    created DESC
                LIMIT
                    ${limit}
                OFFSET
                    ${page * limit}

            `);
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Internal User Error');
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
                };
            }),
        };
    }

    async user(uid: number | string): Promise<UserProfile> {
        let pgres;
        try {
            pgres = await this.pool.execute<{
                id: string;
                level: string;
                username: string;
                access: string;
                email: string;
                flags: Record<string, boolean>;
            }>(sql`
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
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Internal User Error');
        }

        if (pgres.length === 0) {
            throw new Err(404, null, 'Failed to retrieve user');
        }

        return {
            uid: parseInt(pgres[0].id),
            level: pgres[0].level,
            username: pgres[0].username,
            email: pgres[0].email,
            access: pgres[0].access,
            flags: pgres[0].flags,
        };
    }

    async login(user: { username?: string; password?: string }): Promise<UserProfile> {
        if (!user.username) throw new Err(400, null, 'username required');
        if (!user.password) throw new Err(400, null, 'password required');

        if (user.username === 'internal') throw new Err(400, null, '"internal" is not a valid username');

        let pgres;
        try {
            pgres = await this.pool.execute<{
                id: string;
                username: string;
                level: string;
                access: string;
                email: string;
                password: string;
                flags: Record<string, boolean>;
                validated: boolean;
            }>(sql`
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
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Internal Login Error');
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
            flags: pgres[0].flags,
        };
    }

    async register(user: { username?: string; password?: string; email?: string }): Promise<UserRegisterResult> {
        if (!user.username) throw new Err(400, null, 'username required');
        if (!user.password) throw new Err(400, null, 'password required');
        if (!user.email) throw new Err(400, null, 'email required');

        if (user.username === 'internal') throw new Err(400, null, '"internal" is not a valid username');

        try {
            const uhash = await bcrypt.hash(user.password, 10);

            const pgres = await this.pool.execute<{
                id: string;
                username: string;
                email: string;
                access: string;
                level: string;
                flags: Record<string, boolean>;
            }>(sql`
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
                flags: row.flags,
            };
        } catch (err) {
            const e = err as { code?: string; cause?: { code?: string } };
            if (e.code === '23505' || (e.cause && e.cause.code === '23505')) {
                throw new Err(400, null, 'User already exists');
            }

            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Failed to register user');
        }
    }
}
