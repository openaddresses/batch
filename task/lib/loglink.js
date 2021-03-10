'use strict';

const AWS = require('aws-sdk');

const batch = new AWS.Batch({
    region: process.env.AWS_DEFAULT_REGION
});

function log_link() {
    return new Promise((resolve, reject) => {
        // Allow local runs

        link();

        function link() {
            console.error(`ok - getting meta for job: ${process.env.AWS_BATCH_JOB_ID}`);
            batch.describeJobs({
                jobs: [process.env.AWS_BATCH_JOB_ID]
            }, (err, res) => {
                if (err) return reject(err);

                if (
                    !res.jobs[0]
                    || !res.jobs[0].container
                    || !res.jobs[0].container.logStreamName
                ) {
                    setTimeout(() => {
                        return link();
                    }, 10000);
                } else {
                    resolve(res.jobs[0].container.logStreamName);
                }
            });
        }
    });
}

module.exports = loglink;
