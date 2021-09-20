

const AWS = require('aws-sdk');
const batch = new AWS.Batch({ apiVersion: '2016-08-10', region: 'us-east-1' });
const asg = new AWS.AutoScaling({ apiVersion: '2011-01-01', region: 'us-east-1' });

const jobDefinition = process.env.JOB_DEFINITION;
const t3_queue = process.env.T3_QUEUE;
const t3_priority_queue = process.env.T3_PRIORITY_QUEUE;
const mega_queue = process.env.MEGA_QUEUE;

/**
 * Scale Batch T3 ASG Cluster up to MaxSize as needed
 */
async function scale_out() {
    const desc = (await asg.describeAutoScalingGroups({
        AutoScalingGroupNames: [process.env.T3_CLUSTER_ASG]
    }).promise()).AutoScalingGroups[0];

    if (desc.DesiredCapacity < desc.MaxSize) {
        await scale(desc.DesiredCapacity + 1);
    }
}

async function scale(desired) {
    console.log(`ok - scaling to ${desired} instances`);

    await asg.setDesiredCapacity({
        AutoScalingGroupName: process.env.T3_CLUSTER_ASG,
        DesiredCapacity: desired
    }).promise();
}

/**
 * Scale Batch T3 ASG Cluster down based on job queue size
 */
async function scale_in() {
    let queued = 0;

    // Number of EC2 instances in ASG (1 instance = 1 task currently)
    const instances = (await asg.describeAutoScalingGroups({
        AutoScalingGroupNames: [process.env.T3_CLUSTER_ASG]
    }).promise()).AutoScalingGroups[0].DesiredCapacity;

    for (const queue of [t3_queue, t3_priority_queue]) {
        for (const status of ['SUBMITTED', 'PENDING', 'RUNNABLE', 'STARTING', 'RUNNING']) {
            const res = await batch.listJobs({
                jobQueue: queue,
                jobStatus: status
            }).promise();
            console.error(`ok - ${queue}:${status}:${res.jobSummaryList.length} jobs`);
            queued += res.jobSummaryList.length;
        }
    }

    if (queued > instances) {
        console.error(`ok - queued > instances (${queued} > ${instances})`);
        return; // We've still got lots of work to do
    }
    const diff = instances - queued;

    let desired = instances;
    if (diff <= 5) {
        desired = 0;
    } else {
        desired = Math.floor(diff / 2);
    }

    await scale(desired);
}

/**
 * Submit a Job to AWS Batch
 *
 * @param {Object} event (job, collect or sources)
 * @param {String} event.type
 * @param {Number} event.job
 * @param {String} event.source
 * @param {String} event.layer
 * @param {String} event.name
 * @param {Number} event.timeout optional timeout value for "job" and "job-ci" types in seconds
 *
 * @returns {Promise}
 */
async function trigger(event) {
    let timeout = 60 * 60 * 6; // 6 Hours
    if (event.timeout && !isNaN(parseInt(event.timeout))) timeout = event.timeout;

    if (typeof event !== 'object' || Array.isArray(event)) {
        throw new Error('event must be Key/Value pairs');
    }

    if (!event.type) throw new Error('Event Type Required');
    let params;

    if (event.type === 'job' || event.type === 'job-ci') {
        if (!event.job) throw new Error('Job ID required');
        if (!event.source) throw new Error('URL of source required');
        if (!event.layer) throw new Error('Layer of source required');
        if (!event.name) throw new Error('Name of source layer required');

        params = {
            jobDefinition: jobDefinition,
            jobQueue: event.type === 'job' ? t3_queue : t3_priority_queue,
            jobName: `OA_Job_${event.job}`,
            containerOverrides: {
                command: ['./task.js'],
                environment: [
                    { name: 'OA_JOB_ID', value: String(event.job) }
                ]
            },
            timeout: {
                attemptDurationSeconds: timeout
            }
        };
    } else if (event.type === 'export') {
        if (!event.id) throw new Error('Export ID required');

        params = {
            jobDefinition: jobDefinition,
            jobQueue: t3_priority_queue,
            jobName: `OA_Export_${event.id}`,
            containerOverrides: {
                command: ['./export.js'],
                environment: [
                    { name: 'OA_EXPORT_ID', value: String(event.id) }
                ]
            },
            timeout: {
                attemptDurationSeconds: timeout
            }
        };
    } else if (event.type === 'collect') {
        params = {
            jobDefinition: jobDefinition,
            jobQueue: mega_queue,
            jobName: 'OA_Collect',
            containerOverrides: {
                command: ['./collect.js'],
                environment: []
            }
        };
    } else if (event.type === 'sources') {
        params = {
            jobDefinition: jobDefinition,
            jobQueue: t3_queue,
            jobName: 'OA_Sources',
            containerOverrides: {
                command: ['./sources.js'],
                environment: []
            }
        };
    } else {
        throw new Error('Unknown event type: ' + event.type);
    }

    const res = await batch.submitJob(params).promise();

    console.log(`Job ${res.jobName} launched with id ${res.jobId}`);

    try {
        // Scaling should never block the Queue
        await scale_out();
    } catch (err) {
        console.error(err);
        console.error('not ok - Failed to scale out ASG');
    }
}

module.exports = {
    scale_out,
    scale_in,
    trigger
};
