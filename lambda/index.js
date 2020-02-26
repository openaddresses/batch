const AWS = require('aws-sdk');

const batch = new AWS.Batch({
    apiVersion: '2016-08-10'
});

function trigger(event) {
    const jobDefinition = process.env.JOB_DEFINITION;
    const jobQueue = process.env.JOB_QUEUE;
    const jobName = process.env.JOB_NAME;

    const api = process.env.OA_API;

    if (typeof event !== 'object' || Array.isArray(event)) {
        throw new Error('event must be Key/Value pairs');
    }

    if (!event.job) throw new Error('Job ID required');
    if (!event.source) throw new Error('URL of source required');
    if (!event.layer) throw new Error('Layer of source required');
    if (!event.name) throw new Error('Name of source layer required');

    const params = {
        jobDefinition: jobDefinition,
        jobQueue: jobQueue,
        jobName: jobName,
        containerOverrides: {
            environment: [{
                name: 'OA_JOB',
                value: event.job
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

    batch.submitJob(params, (err, res) => {
        if (err) throw err;

        console.log(`Job ${res.jobName} launched with id ${res.jobId}`);
    });
}

module.exports.trigger = trigger;
