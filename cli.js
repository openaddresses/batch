#!/usr/bin/env node

const AWS = require('aws-sdk');
const prompt = require('prompts');
const {promisify} = require('util');
const request = promisify(require('request'));
const batch = new AWS.Batch({
    region: 'us-east-1'
});

const args = require('minimist')(process.argv, {
    boolean: ['help'],
    string: ['url', 'layer', 'name']
});

cli();

async function cli() {
    let url = await prompt([{
        name: 'url',
        message: 'URL of source to send to batch',
        required: true,
        type: 'text',
        initial: args.url
    }]);

    url = url.url;

    let source = await request({
        url: url,
        method: 'GET',
        json: true
    });

    source = source.body;

    if (!source.schema || source.schema !== 2) {
        throw new Error('Batch can only process Schema V2 sources');
    }

    let layer;
    if (Object.keys(source.layers).length > 1) {
        layer = await prompt([{
            name: 'layer',
            message: 'Source layer to send to batch',
            required: true,
            type: 'select',
            choices: Object.keys(source.layers).map((layer) => {
                return {
                    title: layer,
                    value: layer
                };
            })
        }]);

        layer = layer.layer;
    } else {
        layer = Object.keys(source.layers)[0];
    }

    let name;
    if (Object.keys(source.layers[layer]).length > 1) {
        name = await prompt([{
            name: 'name',
            message: 'Layer Name',
            required: true,
            type: 'select',
            choices: source.layers[layer].map((name) => {
                return {
                    title: name.name,
                    value: name.name
                };
            })
        }]);

        name = name.name;
    } else {
         name = source.layers[layer][0].name;
    }

    //TODO this should fire the batch lambda to ensure the task has the proper env vars
    // Batch should not be called directly
    batch.submitJob({
        url: url,
        layer: layer,
        name: name
    }, (err, res) => {
        if (err) throw err;

        console.log(`Job ${res.jobName} launched with id ${res.jobId}`);
    });
}
