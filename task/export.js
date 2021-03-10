#!/usr/bin/env node

'use strict';
const OA = require('lib-oa');
const prompts = require('prompts');

const args = require('minimist')(process.argv, {
    boolean: ['interactive'],
    alias: {
        interactive: 'i'
    }
});

if (!process.env.AWS_DEFAULT_REGION) {
    process.env.AWS_DEFAULT_REGION = 'us-east-1';
}

if (require.main === module) {
    if (args.interactive) return prompt();
    return cli();
}

async function prompt() {
    const p = await prompts([{
        type: 'text',
        name: 'Bucket',
        message: 'AWS S3 bucket to push results to',
        initial: 'v2.openaddresses.io'
    },{
        type: 'text',
        message: 'OA Job ID',
        name: 'OA_JOB'
    },{
        type: 'text',
        message: 'OA Format',
        name: 'OA_FORMAT',
        initial: 'csv'
    },{
        type: 'text',
        message: 'OA Export ID',
        name: 'OA_EXPORT_ID'
    },{
        type: 'text',
        name: 'OA_API',
        message: 'OA API Base URL',
        initial: 'http://localhost:5000'
    },{
        type: 'text',
        name: 'SharedSecret',
        message: 'OA API SharedSecret'
    }]);

    Object.assign(process.env, p);

    return cli();
}

async function cli() {
    if (!process.env.StackName) process.env.StackName = 'local';
    if (!process.env.Bucket) process.env.Bucket = 'v2.openaddreses.io';

    if (!process.env.SharedSecret) throw new Error('No SharedSecret env var defined');
    if (!process.env.OA_JOB) throw new Error('No OA_JOB env var defined');
    if (!process.env.OA_EXPORT_ID) throw new Error('No OA_EXPORT_ID env var defined');
    if (!process.env.OA_FORMAT) throw new Error('No OA_FORMAT env var defined');
    if (!process.env.OA_API) throw new Error('No OA_API env var defined');

    const oa = new OA({
        url: process.env.OA_API,
        secret: process.env.SharedSecret
    });

    const job = await oa.cmd('job', 'get', {
        ':job': process.env.OA_JOB
    });

    console.error(job)

}
