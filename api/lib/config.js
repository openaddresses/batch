'use strict';

const AWS = require('aws-sdk');
const client = new AWS.SecretsManager({
    region: process.env.AWS_DEFAULT_REGION
});

class Config {
    async env() {
        try {
            let github = Config.secret('Batch');

            github = github.GitHub
                .replace('-----BEGIN RSA PRIVATE KEY-----', '')
                .replace('-----END RSA PRIVATE KEY-----', '')
                .replace(/ /g, '\n');

            this.github = `
                -----BEGIN RSA PRIVATE KEY-----
                ${github}
                -----END RSA PRIVATE KEY-----
            `;

            if (!process.env.AWS_DEFAULT_REGION) {
                console.error('ok - set env AWS_DEFAULT_REGION: us-east-1');
                process.env.AWS_DEFAULT_REGION = 'us-east-1';
            }

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
