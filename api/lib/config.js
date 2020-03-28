'use strict';

const AWS = require('aws-sdk');
const pkg = require('../package.json');
const { createAppAuth } = require("@octokit/auth-app");
const { Octokit } = require("@octokit/rest");

class Config {
    static async env() {

        try {
            if (!process.env.AWS_DEFAULT_REGION) {
                console.error('ok - set env AWS_DEFAULT_REGION: us-east-1');
                process.env.AWS_DEFAULT_REGION = 'us-east-1';
            }

            let secrets = await Config.secret('Batch');

            let github = secrets.GitHubKey
                .replace('-----BEGIN RSA PRIVATE KEY-----', '')
                .replace('-----END RSA PRIVATE KEY-----', '')
                .replace(/ /g, '\n');

            github = `-----BEGIN RSA PRIVATE KEY-----${github}-----END RSA PRIVATE KEY-----`;

            console.error(github);

            this.okta = new Octokit({
                type: 'app',
                userAgent: `OpenAddresses v${pkg.version}`,
                authStrategy: createAppAuth,
                auth: {
                    id: 56179,
                    privateKey: github,
                    installationId: 7214840,
                    clientId: secrets.GitHubClientID,
                    clientSecret: secrets.GitHubClientSecret
                }
            });

            if (!process.env.Bucket) {
                console.error('ok - set env Bucket: v2.openaddresses.io');
                process.env.Bucket = 'v2.openaddresses.io';
            }

            if (!process.env.GithubSecret) {
                console.error('ok - set env GithubSecret: no-secret');
                process.env.GithubSecret = 'no-secret';
            }

            if (!process.env.StackName) {
                console.error('ok - set env StackName: test');
                process.env.StackName = 'test';
            }
        } catch (err) {
            throw new Error(err);
        }

        return this;
    }

    static secret(secretName) {
        return new Promise((resolve, reject) => {
            const client = new AWS.SecretsManager({
                region: process.env.AWS_DEFAULT_REGION
            });

            client.getSecretValue({
                SecretId: secretName
            }, (err, data) => {
                if (err) return reject(err);

                try {
                    return resolve(JSON.parse(data.SecretString));
                } catch (err) {
                    return reject(err);
                }
            });
        });
    }
}

module.exports = Config;
