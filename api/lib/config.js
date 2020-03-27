'use strict';

function env() {
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
}

module.exports = env;
