'use strict';

const crypto = require('crypto');
const moment = require('moment');

/**
 * @class Bunny
 */
class Bunny {

    /**
     * @param {String} token Bunny CDN Signing Token
     */
    constructor(token) {
        this.token = token;
    }

    /**
     * Create a URL Token
     *
     * @param {URL} url Bunny CDN Url to sign
     * @param {Date} expires Date at which token should expire
     *
     * @returns {URL} Fully quantified URL
     */
    sign(url, expires) {
        if (!expires) expires = moment().add(1, 'hour').unix();
        const token = crypto.createHash('sha256').update(this.token + url + expires).digest('base64');

        url = new URL(url);
        url.searchParams.append('token', token);
        url.searchParams.append('expires', expires);

        return String(url);
    }
}

module.exports = Bunny;
