import Err from '@openaddresses/batch-error';

/**
 * @class
 */
export default class Auth {
    /**
     * Is the user authenticated
     *
     * @param {Object} req Express Request
     * @param {boolean} token Should URL query tokens be allowed (usually only for downloads)
     */
    static async is_auth(req, token = false) {
        if (token && req.token) req.auth = req.token;

        if (!req.auth || !req.auth.access || !['session', 'token', 'secret'].includes(req.auth.type)) {
            throw new Err(403, null, 'Authentication Required');
        }

        if (req.auth.access === 'disabled') {
            throw new Err(403, null, 'Account Disabled - Please Contact Us');
        }

        return true;
    }

    static async is_level(req, level) {
        await this.is_auth(req);

        if (level === 'basic') {
            return true;
        } else if (level === 'backer' && ['backer', 'sponsor'].includes(req.auth.level)) {
            return true;
        } else if (level === 'sponsor' && req.auth.level === 'sponsor') {
            return true;
        }

        throw new Err(403, null, 'Please donate to use this feature');
    }

    static async is_flag(req, flag) {
        await this.is_auth(req);

        if ((!req.auth.flags || !req.auth.flags[flag]) && req.auth.access !== 'admin' && req.auth.type !== 'secret') {
            throw new Err(403, null, `${flag} flag required`);
        }

        return true;
    }

    static async is_admin(req) {
        if (!req.auth || !req.auth.access || req.auth.access !== 'admin') {
            throw new Err(403, null, 'Admin token required');
        }

        return true;
    }
}
