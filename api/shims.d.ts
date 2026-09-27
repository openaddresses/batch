import type { AuthObject } from './lib/auth.js';

declare global {

    namespace Express {
        interface Request {
            auth: AuthObject | false;
            token?: AuthObject;
        }
    }
}

export {};
