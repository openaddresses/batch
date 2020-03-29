'use strict';

const Err = require('./error');

class Auth {
    static async login() {
        throw new Err(401, null, 'Not Authorized');
    }
}

module.exports = Auth;
