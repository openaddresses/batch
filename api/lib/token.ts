import Err from '@openaddresses/batch-error';
import crypto from 'crypto';
import { promisify } from 'util';
import { sql } from 'drizzle-orm';
import type { Pool } from '@openaddresses/batch-generic';
import type * as pgschema from './schema.js';
import type { AuthObject } from './auth.js';
import type { StandardResponseType, ListTokensResponseType, CreateTokenResponseType } from './types.js';

const randomBytes = promisify(crypto.randomBytes);

/**
 * @class
 */
export default class Token {
    pool: Pool<typeof pgschema>;

    constructor(pool: Pool<typeof pgschema>) {
        this.pool = pool;
    }

    async delete(auth: Partial<AuthObject>, token_id?: number): Promise<StandardResponseType> {
        if (!auth.uid) {
            throw new Err(500, null, 'Server could not determine user id');
        }

        let pgres;
        try {
            pgres = await this.pool.execute(sql`
                DELETE FROM
                    users_tokens
                WHERE
                    uid = ${auth.uid}
                    AND id = ${token_id}
                RETURNING
                    *
            `);
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Failed to delete token');
        }

        if (!pgres.length) throw new Err(401, null, 'You can only access your own tokens');

        return {
            status: 200,
            message: 'Token Deleted',
        };
    }

    async validate(token: string): Promise<AuthObject> {
        if (token.split('.').length !== 2 || token.split('.')[0] !== 'oa' || token.length !== 67) {
            throw new Err(401, null, 'Invalid token');
        }

        let pgres;
        try {
            pgres = await this.pool.execute<{
                uid: string;
                level: string;
                username: string;
                access: string;
                email: string;
                flags: Record<string, boolean>;
            }>(sql`
                SELECT
                    users.id AS uid,
                    users.level,
                    users.username,
                    users.access,
                    users.email,
                    users.flags
                FROM
                    users_tokens INNER JOIN users
                        ON users.id = users_tokens.uid
                WHERE
                    users_tokens.token = ${token}
            `);
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Failed to validate token');
        }

        if (!pgres.length) {
            throw new Err(401, null, 'Invalid token');
        } else if (pgres.length > 1) {
            throw new Err(401, null, 'Token collision');
        }

        return {
            uid: parseInt(pgres[0].uid),
            level: pgres[0].level,
            username: pgres[0].username,
            access: pgres[0].access,
            email: pgres[0].email,
        };
    }

    async list(auth: Partial<AuthObject>): Promise<ListTokensResponseType> {
        if (!auth.uid) {
            throw new Err(500, null, 'Server could not determine user id');
        }

        try {
            const pgres = await this.pool.execute<{
                id: string;
                created: string;
                name: string;
            }>(sql`
                SELECT
                    id,
                    created,
                    name
                FROM
                    users_tokens
                WHERE
                    uid = ${auth.uid}
            `);

            return {
                total: pgres.length,
                tokens: pgres.map((token) => {
                    return {
                        id: parseInt(token.id),
                        created: token.created,
                        name: token.name,
                    };
                }),
            };
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Failed to list tokens');
        }
    }

    async generate(auth: Partial<AuthObject>, name?: string): Promise<CreateTokenResponseType> {
        if (auth.type !== 'session') {
            throw new Err(400, null, 'Only a user session can create a token');
        } else if (!auth.uid) {
            throw new Err(500, null, 'Server could not determine user id');
        } else if (!name || !name.trim()) {
            throw new Err(400, null, 'Token name required');
        }

        try {
            const pgres = await this.pool.execute<{
                id: string;
                name: string;
                token: string;
                created: string;
            }>(sql`
                INSERT INTO users_tokens (
                    token,
                    created,
                    uid,
                    name
                ) VALUES (
                    ${'oa.' + (await randomBytes(32)).toString('hex')},
                    NOW(),
                    ${auth.uid},
                    ${name}
                ) RETURNING *
            `);

            return {
                id: parseInt(pgres[0].id),
                name: pgres[0].name,
                token: pgres[0].token,
                created: pgres[0].created,
            };
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Failed to generate token');
        }
    }
}
