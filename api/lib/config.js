const AWS = require('aws-sdk');
const pkg = require('../package.json');
const { createAppAuth } = require('@octokit/auth-app');
const { Octokit } = require('@octokit/rest');

class Config {
    static async env(args = {}) {
        this.args = args;
        this.limits = args.limit || {
            exports: 300
        };

        try {
            if (!process.env.AWS_DEFAULT_REGION) {
                console.error('ok - set env AWS_DEFAULT_REGION: us-east-1');
                process.env.AWS_DEFAULT_REGION = 'us-east-1';
            }

            if (!process.env.StackName || process.env.StackName === 'test') {
                console.error('ok - set env StackName: test');
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
                this.MailGun = secrets.MailGun;
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
                console.error('ok - set env BaseUrl: http://batch.openaddresses.io');
                process.env.BaseUrl = 'http://batch.openaddresses.io';
                this.BaseUrl = 'http://batch.openaddresses.io';
            }

            if (!process.env.Bucket) {
                console.error('ok - set env Bucket: v2.openaddresses.io');
                process.env.Bucket = 'v2.openaddresses.io';
                this.Bucket = 'v2.openaddresses.io';
            } else {
                this.Bucket = process.env.Bucket;
            }

            if (!process.env.MAPBOX_TOKEN) {
                throw new Error('not ok - MAPBOX_TOKEN env var required');
            }

            if (!process.env.GithubSecret) {
                console.error('ok - set env GithubSecret: no-secret');
                process.env.GithubSecret = 'no-secret';
            }
        } catch (err) {
            throw new Error(err);
        }

        return this;
    }

    static async secret(secretName) {
        const client = new AWS.SecretsManager({
            region: process.env.AWS_DEFAULT_REGION
        });

        const data = client.getSecretValue({
            SecretId: secretName
        }).promise();

        return JSON.parse(data.SecretString);
    }
}

module.exports = Config;
