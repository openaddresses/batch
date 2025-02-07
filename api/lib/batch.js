import Batch from '@aws-sdk/client-batch';
import ASG from '@aws-sdk/client-auto-scaling';

const batch = new Batch.BatchClient({ region: process.env.AWS_DEFAULT_REGION });
const asg = new ASG.AutoScalingClient({ region: process.env.AWS_DEFAULT_REGION });

const jobDefinition = process.env.JOB_DEFINITION;
const t3_queue = process.env.T3_QUEUE;
const t3_priority_queue = process.env.T3_PRIORITY_QUEUE;
const mega_queue = process.env.MEGA_QUEUE;

/**
 * Scale Batch T3 ASG Cluster up to MaxSize as needed
 */
export async function scale_out() {
    const desc = (await asg.send(new ASG.DescribeAutoScalingGroupsCommand({
        AutoScalingGroupNames: [process.env.T3_CLUSTER_ASG]
    }))).AutoScalingGroups[0];

    if (desc.DesiredCapacity < desc.MaxSize) {
        await scale(desc.DesiredCapacity + 1);
    }
}

export async function scale(desired) {
    console.log(`ok - scaling to ${desired} instances`);

    await asg.send(new ASG.SetDesiredCapacityCommand({
        AutoScalingGroupName: process.env.T3_CLUSTER_ASG,
        DesiredCapacity: desired
    }));
}

/**
 * Scale Batch T3 ASG Cluster down based on job queue size
 */
export async function scale_in() {
    let queued = 0;

    // Number of EC2 instances in ASG (1 instance = 1 task currently)
    const instances = (await asg.send(new ASG.DescribeAutoScalingGroupsCommand({
        AutoScalingGroupNames: [process.env.T3_CLUSTER_ASG]
    }))).AutoScalingGroups[0].DesiredCapacity;

    for (const queue of [t3_queue, t3_priority_queue]) {
        for (const status of ['SUBMITTED', 'PENDING', 'RUNNABLE', 'STARTING', 'RUNNING']) {
            const res = await batch.send(new Batch.ListJobsCommand({
                jobQueue: queue,
                jobStatus: status
            }));
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
export async function trigger(event) {
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
                command: ['node', 'task.js'],
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
                command: ['node', 'export.js'],
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
                command: ['node', 'collect.js'],
                environment: []
            }
        };
    } else if (event.type === 'fabric') {
        params = {
            jobDefinition: jobDefinition,
            jobQueue: mega_queue,
            jobName: 'OA_Fabric',
            containerOverrides: {
                command: ['node', 'fabric.js'],
                environment: []
            }
        };
    } else if (event.type === 'sources') {
        params = {
            jobDefinition: jobDefinition,
            jobQueue: t3_queue,
            jobName: 'OA_Sources',
            containerOverrides: {
                command: ['node', 'sources.js'],
                environment: []
            }
        };
    } else {
        throw new Error('Unknown event type: ' + event.type);
    }

    const res = await batch.send(new Batch.SubmitJobCommand(params));

    console.log(`Job ${res.jobName} launched with id ${res.jobId}`);

    try {
        // Scaling should never block the Queue
        await scale_out();
    } catch (err) {
        console.error(err);
        console.error('not ok - Failed to scale out ASG');
    }
}
