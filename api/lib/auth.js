'use strict';

const Err = require('./error');
const bcrypt = require('bcrypt');

class Auth {
    constructor(pool) {
        this.pool = pool;
    }

    async login(user) {
        if (!user.username) throw new Err(400, null, 'username required');
        if (!user.password) throw new Err(400, null, 'password required');

        let pgres;
        try {
            pgres = await this.pool.query(`
                SELECT
                    username,
                    email,
                    password
                FROM
                    users
                WHERE
                    username = $1 OR
                    email = $1;
            `, [
                user.username
            ]);
        } catch (err) {
            throw new Err(500, err, 'Internal Login Error');
        }

        if (pgres.rows.length === 0) {
            throw new Error(403, null, 'Invalid Username or Pass');
        }

        return new Promise((resolve, reject) => {
            bcrypt.compare(user.password, pgres.rows[0].password, (err, res) => {
                if (err) return reject(new Err(500, err, 'Internal Login Error'));

                if (!res) throw new Error(403, null, 'Invalid Username or Pass');

                return resolve({
                    username: pgres.rows[0].username,
                    email: pgres.rows[0].email
                });
            });
        });
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
                        username,
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
                    hash
                ], (err) => {
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
