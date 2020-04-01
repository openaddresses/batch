'use strict';

const Err = require('./error');
const bcrypt = require('bcrypt');

class Auth {
    constructor(pool) {
        this.pool = pool;
    }

    async register(user) {
        if (!user.username) throw new Err(400, null, 'username required');
        if (!user.password) throw new Err(400, null, 'password required');
        if (!user.email) throw new Err(400, null, 'email required');

        return new Promise((resolve, reject) => {
            bcrypt.hash(user.password, 10, (err, hash) => {
                if (err) return reject(new Err(500, err, 'Failed to hash password'));

                this.pool.query(`
                    INSERT INTO users (
                        username
                        email,
                        password
                    ) VALUES (
                        $1,
                        $2,
                        $3
                    )
                `, [
                    user.username,
                    user.email,
                    user.password
                ], (err, pgres) => {
                    if (err) return reject(new Err(500, err, 'Failed to create user'));

                    return resolve({
                        status: 200,
                        message: 'User Created'
                    });
                });
            });
        });
    }
}

module.exports = Auth;
