import SM from '@aws-sdk/client-secrets-manager';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));

/**
 * @class
 */
export default class Config {
    static async env(args = {}) {
        this.args = args;
        this.silent = args.silent;

        this.limits = args.limit || {
            exports: 300
        };

        try {
            if (!process.env.AWS_DEFAULT_REGION) {
                if (!this.silent) console.error('ok - set env AWS_DEFAULT_REGION: us-east-1');
                process.env.AWS_DEFAULT_REGION = 'us-east-1';
            }

            if (!process.env.StackName || process.env.StackName === 'test') {
                if (!this.silent) console.error('ok - set env StackName: test');
                process.env.StackName = 'test';

                this.octo = false;
                this.CookieSecret = '123';
                this.SharedSecret = '123';
                this.StackName = 'test';
            } else {
                const secrets = await Config.secret('Batch');

                this.GithubWebhookSecret = secrets.GithubWebhookSecret;
                this.CookieSecret = secrets.CookieSecret;
                this.SharedSecret = process.env.SharedSecret;
                this.StackName = process.env.StackName;

                let github = secrets.GitHubKey
                    .replace('-----BEGIN RSA PRIVATE KEY-----', '')
                    .replace('-----END RSA PRIVATE KEY-----', '')
                    .replace(/ /g, '\n');

                github = `-----BEGIN RSA PRIVATE KEY-----${github}-----END RSA PRIVATE KEY-----`;

                this.octo = new Octokit({
                    type: 'app',
                    userAgent: `OpenAddresses v${pkg.version}`,
                    authStrategy: createAppAuth,
                    auth: {
                        appId: 56179,
                        privateKey: github,
                        installationId: 7214840,
                        clientId: secrets.GitHubClientID,
                        clientSecret: secrets.GitHubClientSecret
                    }
                });
            }

            if (!process.env.BaseUrl) {
                if (!this.silent) console.error('ok - set env BaseUrl: http://batch.openaddresses.io');
                process.env.BaseUrl = 'http://batch.openaddresses.io';
                this.BaseUrl = 'http://batch.openaddresses.io';
            }

            if (!process.env.Bucket) {
                if (!this.silent) console.error('ok - set env Bucket: v2.openaddresses.io');
                process.env.Bucket = 'v2.openaddresses.io';
                this.Bucket = 'v2.openaddresses.io';
            } else {
                this.Bucket = process.env.Bucket;
            }

            if (!process.env.R2Bucket) {
                if (!this.silent) console.error('ok - set env R2Bucket: openaddresses');
                process.env.R2Bucket = 'openaddresses';
                this.R2Bucket = 'openaddresses';
            } else {
                this.R2Bucket = process.env.R2Bucket;
            }

            if (!process.env.MAPBOX_TOKEN) {
                throw new Error('not ok - MAPBOX_TOKEN env var required');
            }

            if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
                throw new Error('not ok - CLOUDFLARE_ACCOUNT_ID env var required');
            }

            if (!process.env.R2_ACCESS_KEY_ID) {
                throw new Error('not ok - R2_ACCESS_KEY_ID env var required');
            }

            if (!process.env.R2_SECRET_ACCESS_KEY) {
                throw new Error('not ok - R2_SECRET_ACCESS_KEY env var required');
            }

            if (!process.env.GithubSecret) {
                if (!this.silent) console.error('ok - set env GithubSecret: no-secret');
                process.env.GithubSecret = 'no-secret';
            }
        } catch (err) {
            throw new Error(err);
        }

        return this;
    }

    static async secret(secretName) {
        const client = new SM.SecretsManagerClient({
            region: process.env.AWS_DEFAULT_REGION
        });

        const data = await client.send(new SM.GetSecretValueCommand({
            SecretId: secretName
        }));

        return JSON.parse(data.SecretString);
    }
}
