import SES from '@aws-sdk/client-ses';
import Mailgen from 'mailgen';
import Err from '@openaddresses/batch-error';
import type Config from './config.js';

interface EmailUser {
    username: string;
    email: string;
    token: string;
}

/**
 * @class
 */
export default class Email {
    config?: Config;
    ses: SES.SESClient;
    mailGenerator: Mailgen;

    constructor(config?: Config) {
        this.config = config;
        this.ses = new SES.SESClient({ region: process.env.AWS_DEFAULT_REGION });

        this.mailGenerator = new Mailgen({
            theme: 'default',
            product: {
                name: 'OpenAddresses',
                link: 'https://batch.openaddresses.io',
            },
        });
    }

    /**
     * Send an email verification to the user
     */
    async verify(user: EmailUser): Promise<SES.SendEmailCommandOutput> {
        const email = {
            body: {
                name: user.email,
                intro: 'OpenAddresses Email Confirmation',
                action: {
                    instructions: `Hello ${user.username}, to finish creating your account, please click here:`,
                    button: {
                        color: 'green',
                        text: 'Verify Email',
                        link: 'http://batch.openaddresses.io/login/verify?token=' + user.token,
                    },
                },
                outro: 'Need help, or have questions? Open an issue here: https://github.com/openaddresses/batch/issues/new/choose',
            },
        };

        try {
            return this.send(user.email, 'OpenAddresses Email Confirmation', this.mailGenerator.generate(email));
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Internal User Confirmation Error');
        }
    }

    async forgot(user: EmailUser): Promise<SES.SendEmailCommandOutput> {
        const email = {
            body: {
                name: user.email,
                intro: 'OpenAddresses Password Reset',
                action: {
                    instructions: `Hello ${user.username}, to reset your password, please click here:`,
                    button: {
                        color: 'green',
                        text: 'Password Reset',
                        link: 'http://batch.openaddresses.io/login/reset?token=' + user.token,
                    },
                },
                outro: 'Need help, or have questions? Open an issue here: https://github.com/openaddresses/batch/issues/new/choose',
            },
        };

        try {
            return this.send(user.email, 'OpenAddresses Password Reset', this.mailGenerator.generate(email));
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Internal User Forgot Error');
        }
    }

    /**
     * Send an email via the AWS SES Service
     * Note: All emails are sent from robot@<domain>
     *
     * @param email   email recipient
     * @param subject email subject
     * @param body    HTML body to send
     */
    async send(email: string, subject: string, body: string): Promise<SES.SendEmailCommandOutput> {
        return await this.ses.send(new SES.SendEmailCommand({
            Destination: {
                ToAddresses: [email],
            },
            Source: 'no-reply@openaddresses.io',
            Message: {
                Subject: {
                    Data: subject,
                },
                Body: {
                    Html: {
                        Data: body,
                    },
                },
            },
        }));
    }
}
