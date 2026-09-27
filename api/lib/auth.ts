import Err from '@openaddresses/batch-error';
import type { Request } from 'express';

export type AuthType = 'session' | 'token' | 'secret';

// Any typed Express request satisfies this - Auth only reads req.auth/req.token.
// ResBody is `never` because Response<ResBody> is contravariant in that slot.
type AnyRequest = Request<unknown, never, unknown, unknown>;

export interface AuthObject {
    uid: number | false;
    type?: AuthType;
    level: string;
    username: string | false;
    access: string;
    email: string | false;
    flags?: Record<string, boolean>;
}

/**
 * @class
 */
export default class Auth {
    /**
     * Is the user authenticated
     *
     * @param req   Express Request
     * @param token Should URL query tokens be allowed (usually only for downloads)
     */
    static async is_auth(req: AnyRequest, token = false): Promise<AuthObject> {
        if (token && req.token) req.auth = req.token;

        if (!req.auth || !req.auth.access || !req.auth.type || !['session', 'token', 'secret'].includes(req.auth.type)) {
            throw new Err(403, null, 'Authentication Required');
        }

        if (req.auth.access === 'disabled') {
            throw new Err(403, null, 'Account Disabled - Please Contact Us');
        }

        return req.auth;
    }

    static async is_level(req: AnyRequest, level: string): Promise<AuthObject> {
        const auth = await this.is_auth(req);

        if (level === 'basic') {
            return auth;
        } else if (level === 'backer' && ['backer', 'sponsor'].includes(auth.level)) {
            return auth;
        } else if (level === 'sponsor' && auth.level === 'sponsor') {
            return auth;
        }

        throw new Err(403, null, 'Please donate to use this feature');
    }

    static async is_flag(req: AnyRequest, flag: string): Promise<AuthObject> {
        const auth = await this.is_auth(req);

        if ((!auth.flags || !auth.flags[flag]) && auth.access !== 'admin' && auth.type !== 'secret') {
            throw new Err(403, null, `${flag} flag required`);
        }

        return auth;
    }

    static async is_admin(req: AnyRequest): Promise<AuthObject> {
        if (!req.auth || !req.auth.access || req.auth.access !== 'admin') {
            throw new Err(403, null, 'Admin token required');
        }

        return req.auth;
    }
}
