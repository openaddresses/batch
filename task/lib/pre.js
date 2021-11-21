const inquirer = require('inquirer');

if (!process.env.AWS_DEFAULT_REGION) {
    process.env.AWS_DEFAULT_REGION = 'us-east-1';
}

const AWS = require('aws-sdk');

async function secret(secretName) {
    const client = new AWS.SecretsManager({
        region: process.env.AWS_DEFAULT_REGION
    });

    const data = await client.getSecretValue({
        SecretId: secretName
    }).promise();

    return data.SecretString;
}

async function interactive(additional = []) {
    const p = await inquirer.prompt([{
        type: 'list',
        name: 'StackName',
        message: 'Which stack to run off',
        choices: [
            'local',
            'batch-prod'
        ]
    }].concat(additional));

    p.Bucket = 'v2.openaddresses.io';

    if (p.StackName === 'local') {
        p.SharedSecret = '123';
        p.OA_API = 'http://localhost:5000';
    } else {
        p.SharedSecret = await secret('batch-prod/api/signing-secret');
        p.OA_API = 'https://batch.openaddresses.io';
    }

    Object.assign(process.env, p);
}

module.exports = {
    interactive,
    secret
};
