import AWS from 'aws-sdk';
import Mailgen from 'mailgen';
import { Err } from '@openaddresses/batch-schema';

/**
 * @class
 */
export default class Email {
    constructor(config) {
        this.config = config;
        this.ses = new AWS.SES({
            region: process.env.AWS_DEFAULT_REGION
        });

        this.mailGenerator = new Mailgen({
            theme: 'default',
            product: {
                name: 'OpenAddresses',
                link: 'https://batch.openaddresses.io'
            }
        });
    }

    /**
     * Send an email verification to the user
     *
     * @param {Object} user
     * @param {String} user.username
     * @param {String} user.email
     * @param {String} user.token
     */
    async verify(user) {
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
            return this.send(user.email, 'OpenAddresses Email Confirmation', this.mailGenerator.generate(email));
        } catch (err) {
            throw new Err(500, err, 'Internal User Confirmation Error');
        }
    }

    async forgot(user) {
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
            return this.send(user.email, 'OpenAddresses Password Reset', this.mailGenerator.generate(email));
        } catch (err) {
            throw new Err(500, err, 'Internal User Forgot Error');
        }
    }

    /**
     * Send an email via the AWS SES Service
     * Note: All emails are sent from robot@<domain>
     *
     * @param {string} email email recipient
     * @param {string} subject email subject
     * @param {string} body HTML body to send
     */
    async send(email, subject, body) {
        return await this.ses.sendEmail({
            Destination: {
                ToAddresses: [email]
            },
            Source: 'no-reply@openaddresses.io',
            Message: {
                Subject: {
                    Data: subject
                },
                Body: {
                    Html: {
                        Data: body
                    }
                }
            }
        }).promise();
    }

}
