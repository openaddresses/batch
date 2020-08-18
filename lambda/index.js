'use strict';

const AWS = require('aws-sdk');

const batch = new AWS.Batch({
    apiVersion: '2016-08-10'
});

function trigger(event) {
    const jobDefinition = process.env.JOB_DEFINITION;
    const jobStdQueue = process.env.JOB_STD_QUEUE;
    const jobMegaQueue = process.env.JOB_MEGA_QUEUE;
    const jobName = process.env.JOB_NAME;

    console.error('EVENT: ', JSON.stringify(event));

    if (typeof event !== 'object' || Array.isArray(event)) {
        throw new Error('event must be Key/Value pairs');
    }

    if (!event.type) throw new Error('Event Type Required');
    let params;

    if (event.type === 'job') {
        if (!event.job) throw new Error('Job ID required');
        if (!event.source) throw new Error('URL of source required');
        if (!event.layer) throw new Error('Layer of source required');
        if (!event.name) throw new Error('Name of source layer required');

        params = {
            jobDefinition: jobDefinition,
            jobQueue: jobStdQueue,
            jobName: jobName,
            containerOverrides: {
                command: ['./task.js'],
                environment: [{
                    name: 'OA_JOB',
                    value: String(event.job)
                },{
                    name: 'OA_SOURCE',
                    value: event.source
                },{
                    name: 'OA_SOURCE_LAYER',
                    value: event.layer
                },{
                    name: 'OA_SOURCE_LAYER_NAME',
                    value: event.name
                }]
            }
        };
    } else if (event.type === 'collect') {
        params = {
            jobDefinition: jobDefinition,
            jobQueue: jobMegaQueue,
            jobName: jobName,
            containerOverrides: {
                command: ['./collect.js'],
                environment: []
            }
        };
    } else if (event.type === 'sources') {
        params = {
            jobDefinition: jobDefinition,
            jobQueue: jobStdQueue,
            jobName: jobName,
            containerOverrides: {
                command: ['./sources.js'],
                environment: []
            }
        };
    } else {
        throw new Error('Unknown event type: ' + event.type);
    }

    console.error(JSON.stringify(params));

    batch.submitJob(params, (err, res) => {
        if (err) throw err;

        console.log(`Job ${res.jobName} launched with id ${res.jobId}`);
    });
}

module.exports.trigger = trigger;
