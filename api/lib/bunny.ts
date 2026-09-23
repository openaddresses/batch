import crypto from 'crypto';
import moment from 'moment';

/**
 * @class
 */
export default class Bunny {
    token: string;

    /**
     * @param token Bunny CDN Signing Token
     */
    constructor(token: string) {
        this.token = token;
    }

    /**
     * Create a URL Token
     *
     * @param url     Bunny CDN Url to sign
     * @param expires Unix timestamp at which token should expire
     *
     * @returns Fully quantified URL
     */
    sign(url: string, expires?: number): string {
        if (!expires) expires = moment().add(1, 'hour').unix();
        const token = crypto.createHash('sha256').update(this.token + url + expires).digest('base64');

        const signed = new URL(url);
        signed.searchParams.append('token', token);
        signed.searchParams.append('expires', String(expires));

        return String(signed);
    }
}
