import Batch from '@aws-sdk/client-batch';
import ASG from '@aws-sdk/client-auto-scaling';
import ECS from '@aws-sdk/client-ecs';

const batch = new Batch.BatchClient({ region: process.env.AWS_DEFAULT_REGION });
const asg = new ASG.AutoScalingClient({ region: process.env.AWS_DEFAULT_REGION });
const ecs = new ECS.ECSClient({ region: process.env.AWS_DEFAULT_REGION });

const jobDefinition = process.env.JOB_DEFINITION;
const t3_queue = process.env.T3_QUEUE;
const t3_priority_queue = process.env.T3_PRIORITY_QUEUE;
const mega_queue = process.env.MEGA_QUEUE;
const large_queue = process.env.LARGE_QUEUE;

/**
 * Look up a source's conform.size tag (see CONTRIBUTING.md in the sources
 * repo) to decide whether a job needs the large-disk queue. Fails open to
 * 'standard' - a source we can't check should behave like every source did
 * before this existed, not block submission.
 *
 * @param {Object} event Same event passed to trigger()
 */
async function sourceSizeTier(event) {
    try {
        const res = await fetch(event.source);
        if (!res.ok) return 'standard';

        const src = await res.json();
        const entries = (src.layers && src.layers[event.layer]) || [];
        const entry = entries.find((e) => e.name === event.name);

        return entry?.conform?.size === 'large' ? 'large' : 'standard';
    } catch (err) {
        console.error('not ok - failed to check source size tier, defaulting to standard:', err.message);
        return 'standard';
    }
}

const FABRIC_LAYERS = ['addresses', 'buildings', 'parcels', 'centerlines'];

async function submit(params) {
    const res = await batch.send(new Batch.SubmitJobCommand(params));
    console.log(`Job ${res.jobName} launched with id ${res.jobId}`);
    return res;
}

async function afterSubmit() {
    try {
        // Scaling should never block the Queue
        await scale_out();
    } catch (err) {
        console.error(err);
        console.error('not ok - Failed to scale out ASG');
    }
}

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
 * EC2 instance IDs that are actually backing a RUNNING/STARTING job attempt
 * on the given queues, resolved via Batch's ECS container instance for each
 * job attempt. Instances not in this set have nothing running on them,
 * regardless of what else is queued elsewhere.
 */
async function instancesRunningJobs(queues) {
    const jobIds = [];
    for (const queue of queues) {
        for (const status of ['STARTING', 'RUNNING']) {
            const res = await batch.send(new Batch.ListJobsCommand({
                jobQueue: queue,
                jobStatus: status
            }));
            jobIds.push(...res.jobSummaryList.map((j) => j.jobId));
        }
    }

    const containerInstanceArns = new Set();
    for (let i = 0; i < jobIds.length; i += 100) {
        const res = await batch.send(new Batch.DescribeJobsCommand({
            jobs: jobIds.slice(i, i + 100)
        }));

        for (const job of res.jobs) {
            if (job.container?.containerInstanceArn) {
                containerInstanceArns.add(job.container.containerInstanceArn);
            }
        }
    }

    // A container instance ARN is arn:aws:ecs:region:account:container-instance/cluster-name/id
    const arnsByCluster = new Map();
    for (const arn of containerInstanceArns) {
        const cluster = arn.split('/')[1];
        if (!arnsByCluster.has(cluster)) arnsByCluster.set(cluster, []);
        arnsByCluster.get(cluster).push(arn);
    }

    const instanceIds = new Set();
    for (const [cluster, arns] of arnsByCluster) {
        const res = await ecs.send(new ECS.DescribeContainerInstancesCommand({
            cluster,
            containerInstances: arns
        }));

        for (const ci of res.containerInstances) {
            if (ci.ec2InstanceId) instanceIds.add(ci.ec2InstanceId);
        }
    }

    return instanceIds;
}

/**
 * Clear scale-in protection from ASG instances that are protected
 * but not actually backing any RUNNING/STARTING Batch job. This handles
 * cases where a task process crashed (OOM, SIGKILL) without calling
 * protection(false) - checked per-instance so one straggler job elsewhere
 * in the queue can't keep every other crashed instance protected.
 */
async function clear_stale_protection() {
    const desc = (await asg.send(new ASG.DescribeAutoScalingGroupsCommand({
        AutoScalingGroupNames: [process.env.T3_CLUSTER_ASG]
    }))).AutoScalingGroups[0];

    const protectedIds = desc.Instances
        .filter((i) => i.ProtectedFromScaleIn)
        .map((i) => i.InstanceId);

    if (protectedIds.length === 0) return;

    const busyIds = await instancesRunningJobs([t3_queue, t3_priority_queue]);
    const staleIds = protectedIds.filter((id) => !busyIds.has(id));

    if (staleIds.length > 0) {
        console.error(`ok - clearing stale scale-in protection from ${staleIds.length} instances: ${staleIds.join(', ')}`);
        await asg.send(new ASG.SetInstanceProtectionCommand({
            AutoScalingGroupName: process.env.T3_CLUSTER_ASG,
            InstanceIds: staleIds,
            ProtectedFromScaleIn: false
        }));
    }
}

/**
 * Scale Batch T3 ASG Cluster down based on job queue size
 */
export async function scale_in() {
    // Clear stale protection before scaling so the ASG can actually terminate idle instances
    try {
        await clear_stale_protection();
    } catch (err) {
        console.error('not ok - Failed to clear stale protection:', err);
    }

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

    if (queued >= instances) {
        console.error(`ok - queued >= instances (${queued} >= ${instances}), not scaling in`);
        return;
    }

    // Scale down excess instances, but never below the number of queued jobs
    const diff = instances - queued;
    let desired;
    if (diff <= 5) {
        desired = queued;
    } else {
        desired = instances - Math.floor(diff / 2);
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

        // A source tagged conform.size:"large" (e.g. NAD) always goes to the
        // large-disk queue, regardless of job vs job-ci - correctness over
        // the job-ci fast lane for this rare case.
        const tier = await sourceSizeTier(event);
        const queue = tier === 'large' ? large_queue : (event.type === 'job' ? t3_queue : t3_priority_queue);

        params = {
            jobDefinition: jobDefinition,
            jobQueue: queue,
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
                // Container gets 15000MB; Node's default old-space cap (~4GB)
                // would leave most of that unused and force collect.js's
                // MAX_PROCESSED_FEATURES safety valve to skip most real
                // collections. 10000MB raises the heap ceiling while leaving
                // ~5000MB headroom for the OS, container runtime overhead,
                // non-heap V8 memory (array buffers, external allocations),
                // and the process's own baseline footprint.
                command: ['node', '--max-old-space-size=10000', 'collect.js'],
                environment: [],
                vcpus: 4,
                memory: 15000
            },
            timeout: {
                attemptDurationSeconds: 60 * 60 * 24  // 24 hour backstop; per-source fetches self-timeout well before this
            }
        };
    } else if (event.type === 'fabric') {
        // Each layer (plus borders) is submitted as its own job with its own
        // 3-day budget, so a slow/stuck layer (e.g. addresses, by far the
        // largest) can't starve the others out of the week entirely - they
        // used to all share one job and one timeout, processed sequentially.
        const fabricJobs = [
            { name: 'Border', args: ['--border'] },
            ...FABRIC_LAYERS.map((layer) => ({
                name: layer.charAt(0).toUpperCase() + layer.slice(1),
                args: ['--fabric', '--layer', layer]
            }))
        ];

        for (const job of fabricJobs) {
            // addresses is by far the largest layer - tile-join's peak memory
            // when merging its shards scales with total merged tile volume and
            // empirically exceeds 58GB at national scale (confirmed by a real
            // OOM here, and by local scaling tests up to 51GB of real source
            // data). Give it a bigger box; the other layers/border fit
            // comfortably within the default r5.2xlarge-sized job.
            const big = job.name === 'Addresses';
            await submit({
                jobDefinition: jobDefinition,
                jobQueue: mega_queue,
                jobName: `OA_Fabric_${job.name}`,
                containerOverrides: {
                    command: ['node', 'fabric.js', ...job.args],
                    environment: [],
                    vcpus: big ? 16 : 8,
                    memory: big ? 110000 : 58000
                },
                timeout: {
                    attemptDurationSeconds: 60 * 60 * 24 * 3  // 3 day hard cap, per layer
                }
            });
        }

        return await afterSubmit();
    } else if (event.type === 'cleanup') {
        params = {
            jobDefinition: jobDefinition,
            jobQueue: t3_queue,
            jobName: 'OA_Cleanup',
            containerOverrides: {
                command: ['node', 'cleanup.js'],
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

    await submit(params);

    return await afterSubmit();
}
