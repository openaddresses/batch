import SM from '@aws-sdk/client-secrets-manager';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import fs from 'fs';
import type { Pool } from '@openaddresses/batch-generic';
import type * as pgschema from './schema.js';
import type Models from './models.js';
import type Cacher from './cacher.js';

const pkg: { version: string } = JSON.parse(String(fs.readFileSync(new URL('../package.json', import.meta.url))));

export interface ConfigArgs {
    'help'?: boolean;
    'populate'?: boolean;
    'email'?: boolean;
    'no-cache'?: boolean;
    'no-migrate'?: boolean;
    'silent'?: boolean;
    'postgres'?: string;
    'limit'?: { exports: number };
}

/**
 * @class
 */
export default class Config {
    args!: ConfigArgs;
    silent?: boolean;
    limits!: { exports: number };
    octo!: Octokit | false;
    GithubWebhookSecret?: string;
    CookieSecret!: string;
    SharedSecret!: string;
    StackName!: string;
    BaseUrl!: string;
    Bucket!: string;
    R2Bucket!: string;

    // Assigned by the server bootstrap in index.ts once the DB pool is up
    pool!: Pool<typeof pgschema>;
    models!: Models;
    cacher!: Cacher;

    // Optional TileBase-backed fabric tile source
    tb?: {
        tilejson(): Record<string, unknown>;
        tile(z: number, x: number, y: number): Promise<Buffer>;
    };

    static async env(args: ConfigArgs = {}): Promise<Config> {
        const config = new Config();
        config.args = args;
        config.silent = args.silent;

        config.limits = args.limit || {
            exports: 300,
        };

        try {
            if (!process.env.AWS_DEFAULT_REGION) {
                if (!config.silent) console.error('ok - set env AWS_DEFAULT_REGION: us-east-1');
                process.env.AWS_DEFAULT_REGION = 'us-east-1';
            }

            console.error(process.env.StackName);
            if (!process.env.StackName || process.env.StackName === 'test') {
                if (!config.silent) console.error('ok - set env StackName: test');
                process.env.StackName = 'test';

                config.octo = false;
                config.CookieSecret = '123';
                config.SharedSecret = '123';
                config.StackName = 'test';
            } else {
                const secrets = await Config.secret('Batch');

                config.GithubWebhookSecret = secrets.GithubWebhookSecret;
                config.CookieSecret = secrets.CookieSecret;
                config.SharedSecret = String(process.env.SharedSecret);
                config.StackName = process.env.StackName;

                let github = secrets.GitHubKey
                    .replace('-----BEGIN RSA PRIVATE KEY-----', '')
                    .replace('-----END RSA PRIVATE KEY-----', '')
                    .replace(/ /g, '\n');

                github = `-----BEGIN RSA PRIVATE KEY-----${github}-----END RSA PRIVATE KEY-----`;

                config.octo = new Octokit({
                    type: 'app',
                    userAgent: `OpenAddresses v${pkg.version}`,
                    authStrategy: createAppAuth,
                    auth: {
                        appId: 56179,
                        privateKey: github,
                        installationId: 7214840,
                        clientId: secrets.GitHubClientID,
                        clientSecret: secrets.GitHubClientSecret,
                    },
                });
            }

            if (!process.env.BaseUrl) {
                if (!config.silent) console.error('ok - set env BaseUrl: http://batch.openaddresses.io');
                process.env.BaseUrl = 'http://batch.openaddresses.io';
                config.BaseUrl = 'http://batch.openaddresses.io';
            } else {
                config.BaseUrl = process.env.BaseUrl;
            }

            if (!process.env.Bucket) {
                if (!config.silent) console.error('ok - set env Bucket: v2.openaddresses.io');
                process.env.Bucket = 'v2.openaddresses.io';
                config.Bucket = 'v2.openaddresses.io';
            } else {
                config.Bucket = process.env.Bucket;
            }

            if (!process.env.R2Bucket) {
                if (!config.silent) console.error('ok - set env R2Bucket: openaddresses');
                process.env.R2Bucket = 'openaddresses';
                config.R2Bucket = 'openaddresses';
            } else {
                config.R2Bucket = process.env.R2Bucket;
            }

            if (!process.env.PROTOMAPS_KEY) {
                throw new Error('not ok - PROTOMAPS_KEY env var required');
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
                if (!config.silent) console.error('ok - set env GithubSecret: no-secret');
                process.env.GithubSecret = 'no-secret';
            }
        } catch (err) {
            throw err instanceof Error ? err : new Error(String(err));
        }

        return config;
    }

    static async secret(secretName: string): Promise<Record<string, string>> {
        const client = new SM.SecretsManagerClient({
            region: process.env.AWS_DEFAULT_REGION,
        });

        const data = await client.send(new SM.GetSecretValueCommand({
            SecretId: secretName,
        }));

        return JSON.parse(String(data.SecretString));
    }
}
