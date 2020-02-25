#!/usr/bin/env node

const AWS = require('aws-sdk');
const prompt = require('prompts');
const {promisify} = require('util');
const request = promisify(require('request'));
const lambda = new AWS.Lambda({
    region: 'us-east-1'
});

const args = require('minimist')(process.argv, {
    boolean: ['help'],
    string: ['stack', 'url', 'layer', 'name']
});

cli();

async function cli() {
    let params = await prompt([{
        name: 'stack',
        message: 'batch stack to queue to',
        required: true,
        type: 'text',
        initial: args.stack
    },{
        name: 'url',
        message: 'URL of source to send to batch',
        required: true,
        type: 'text',
        initial: args.url
    }]);

    const url = params.url;
    const stack = params.stack;

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

    lambda.invoke({
        FunctionName: `batch-${stack}-invoke`,
        InvocationType: 'Event',
        LogType: 'Tail',
        Payload: JSON.stringify({
            source: url,
            layer: layer,
            name: name
        })
    }, (err, data) => {
        if (err) throw err;

        console.error(data);
    });
}
