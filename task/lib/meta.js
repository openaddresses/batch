import Batch from '@aws-sdk/client-batch';
import AutoScaling from '@aws-sdk/client-auto-scaling';
import ECS from '@aws-sdk/client-ecs';

/**
 * @class Meta
 *
 * @prop {String} job_id - Batch Job ID
 * @prop {String} asg - Name of ECS Cluster AutoScalingGroup
 * @prop {String} cluster - Name of ECS Cluster
 * @prop {String} container - ARN of ECS Container Instance
 * @prop {String} instance - ID of EC2 Instance
 * @prop {String} loglink - CloudWatch Log ID
 */
export default class Meta {
    /**
     * @constructor
     */
    constructor() {
        this.job_id = process.env.AWS_BATCH_JOB_ID;
        this.asg = process.env.T3_CLUSTER_ASG;

        this.cluster  = false;
        this.container = false;
        this.instance = false;
        this.loglink = false;
    }

    /**
     * Populate the Meta instance state from AWS APIs
     */
    async load() {
        if (!this.job_id) {
            console.error('ok - skipping meta#load due to non-aws environment');
            return;
        }

        let first = true;
        let jobs = false;
        let instances = false;

        const batch = new Batch.BatchClient({ region: process.env.AWS_DEFAULT_REGION });

        do {
            if (!first) await this.sleep(5000);

            jobs = await batch.send(new Batch.DescribeJobsCommand({
                jobs: [process.env.AWS_BATCH_JOB_ID]
            }));

            first = false;
        } while (!jobs || !jobs.jobs[0] || !jobs.jobs[0].container || !jobs.jobs[0].container.containerInstanceArn || !jobs.jobs[0].container.logStreamName);

        this.container = jobs.jobs[0].container.containerInstanceArn;
        this.cluster = jobs.jobs[0].container.containerInstanceArn.split('/')[1];
        this.loglink = jobs.jobs[0].container.logStreamName;

        first = true;

        const ecs = new ECS.ECSClient({ region: process.env.AWS_DEFAULT_REGION });

        do {
            if (!first) await this.sleep(5000);

            instances = await ecs.send(new ECS.DescribeContainerInstancesCommand({
                cluster: this.cluster,
                containerInstances: [this.container]
            }));

            first = false;
        } while (!instances || !instances.containerInstances[0] || !instances.containerInstances[0].ec2InstanceId);

        this.instance = instances.containerInstances[0].ec2InstanceId;
    }

    /**
     * Mark the underlying EC2 instance as scale-in protected
     *
     * @param {boolean} protect Should the instance be protected
     */
    async protection(protect) {
        if (!this.job_id) {
            console.error('ok - skipping meta#protection due to non-aws environment');
            return;
        }

        const asg = new AutoScaling.AutoScalingClient({ region: process.env.AWS_DEFAULT_REGION });

        await asg.send(new AutoScaling.SetInstanceProtectionCommand({
            AutoScalingGroupName: this.asg,
            InstanceIds: [this.instance],
            ProtectedFromScaleIn: protect
        }));
    }

    /**
     * Sleep for n milliseconds
     *
     * @param {Number} ms Milliseconds to sleep
     */
    async sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }
}
