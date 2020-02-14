const AWS = require('aws-sdk');

const batch = new AWS.Batch({
    apiVersion: '2016-08-10'
});

function trigger() {
    const jobDefinition = process.env.JOB_DEFINITION;
    const jobQueue = process.env.JOB_QUEUE;
    const jobName = process.env.JOB_NAME;

    const params = {
        'jobDefinition': jobDefinition,
        'jobQueue': jobQueue,
        'jobName': jobName
    };

    console.log('params', JSON.stringify(params));

    batch.submitJob(params, (err, res) => {
        if (err) return console.error(err);
        console.log(`Job ${res.jobName} launched with id ${res.jobId}`);
    });
}

module.exports.trigger = trigger;
