'use strict';

const AWS = require('aws-sdk');

const batch = new AWS.Batch({ region: process.env.AWS_DEFAULT_REGION });
const ecs = new AWS.ECS({ region: process.env.AWS_DEFAULT_REGION });
const asg = new AWS.AutoScaling({ region: process.env.AWS_DEFAULT_REGION });

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
class Meta {
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

        do {
            if (!first) await this.sleep(5000);

            jobs = await batch.describeJobs({
                jobs: [process.env.AWS_BATCH_JOB_ID]
            }).promise();

            first = false;
        } while (!jobs || !jobs.jobs[0] || !jobs.jobs[0].container || !jobs.jobs[0].container.containerInstanceArn || !jobs.jobs[0].container.logStreamName);

        this.container = jobs.jobs[0].container.containerInstanceArn;
        this.cluster = jobs.jobs[0].container.containerInstanceArn.split('/')[1];
        this.loglink = jobs.jobs[0].container.logStreamName;

        first = true;
        do {
            if (!first) await this.sleep(5000);

            instances = await ecs.describeContainerInstances({
                cluster: this.cluster,
                containerInstances: [this.container]
            }).promise();

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

        await asg.setInstanceProtection({
            AutoScalingGroupName: this.asg,
            InstanceIds: [this.instance],
            ProtectedFromScaleIn: protect
        }).promise();
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

module.exports = Meta;
