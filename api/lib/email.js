'use strict';

const Mailgen = require('mailgen');
const mailgun = require('mailgun.js');
const Err = require('./error');

/**
 * @class Email
 */
class Email {
    constructor(pg, arg = {}, srv = {}) {
        this.pg = pg;
        this.arg = arg;
        this.srv = srv;

        if (process.env.MAILGUN_API_KEY) {
            this.mg = mailgun.client({
                username: 'api',
                key: process.env.MAILGUN_API_KEY
            });

            this.mailGenerator = new Mailgen({
                theme: 'default',
                product: {
                    name: 'OpenAddresses',
                    link: 'https://batch.openaddresses.io'
                }
            });
        }
    }

    async validate(user) {
        if (!this.mg) return;

        const email = {
            body: {
                name: user.email,
                intro: 'OpenAddresses Email Confirmation',
                action: {
                    instructions: `Hello ${user.username}, to finish creating your account, please click here:`,
                    button: {
                        color: 'green',
                        text: 'Verify Email',
                        link: 'http://batch.openaddresses.io/login/verify?token=' + user.token
                    }
                },
                outro: 'Need help, or have questions? Open an issue here: https://github.com/openaddresses/batch/issues/new/choose'
            }
        };

        try {
            await this.mg.messages.create('robot.openaddresses.io', {
                to: user.email,
                from: 'hello@openaddresses.io',
                html: this.mailGenerator.generate(email),
                subject: 'OpenAddresses Email Confirmation'
            });
        } catch (err) {
            throw new Err(500, err, 'Internal User Confirmation Error');
        }
    }

    async forgot(user) {
        if (!this.mg) return;

        const email = {
            body: {
                name: user.email,
                intro: 'OpenAddresses Password Reset',
                action: {
                    instructions: `Hello ${user.username}, to reset your password, please click here:`,
                    button: {
                        color: 'green',
                        text: 'Password Reset',
                        link: 'http://batch.openaddresses.io/login/reset?token=' + user.token
                    }
                },
                outro: 'Need help, or have questions? Open an issue here: https://github.com/openaddresses/batch/issues/new/choose'
            }
        };

        try {
            await this.mg.messages.create('robot.openaddresses.io', {
                to: user.email,
                from: 'hello@openaddresses.io',
                html: this.mailGenerator.generate(email),
                subject: 'OpenAddresses Password Reset'
            });
        } catch (err) {
            throw new Err(500, err, 'Internal User Forgot Error');
        }
    }
}

module.exports = Email;
