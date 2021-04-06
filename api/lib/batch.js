'use strict';

const AWS = require('aws-sdk');
const batch = new AWS.Batch({
    apiVersion: '2016-08-10'
});

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
function trigger(event) {
    return new Promise((resolve, reject) => {
        const jobDefinition = process.env.JOB_DEFINITION;
        const t3_queue = process.env.T3_QUEUE;
        const t3_priority_queue = process.env.T3_PRIORITY_QUEUE;
        const mega_queue = process.env.MEGA_QUEUE;

        let timeout = 60 * 60 * 6; // 6 Hours
        if (event.timeout && !isNaN(parseInt(event.timeout))) timeout = event.timeout;

        if (typeof event !== 'object' || Array.isArray(event)) {
            return reject(new Error('event must be Key/Value pairs'));
        }

        if (!event.type) return reject(new Error('Event Type Required'));
        let params;

        if (event.type === 'job' || event.type === 'job-ci') {
            if (!event.job) return reject(new Error('Job ID required'));
            if (!event.source) return reject(new Error('URL of source required'));
            if (!event.layer) return reject(new Error('Layer of source required'));
            if (!event.name) return reject(new Error('Name of source layer required'));

            params = {
                jobDefinition: jobDefinition,
                jobQueue: event.type === 'job' ? t3_queue : t3_priority_queue,
                jobName: `OA_Job_${event.job}`,
                containerOverrides: {
                    command: ['./task.js'],
                    environment: [
                        { name: 'OA_JOB', value: String(event.job) },
                        { name: 'OA_SOURCE', value: event.source },
                        { name: 'OA_SOURCE_LAYER', value: event.layer },
                        { name: 'OA_SOURCE_LAYER_NAME', value: event.name }
                    ]
                },
                timeout: {
                    attemptDurationSeconds: timeout
                }
            };
        } else if (event.type === 'export') {
            if (!event.id) return reject(new Error('Export ID required'));

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

        console.error(JSON.stringify(params));

        batch.submitJob(params, (err, res) => {
            if (err) return reject(err);

            console.log(`Job ${res.jobName} launched with id ${res.jobId}`);
            return resolve();
        });
    });
}

module.exports = trigger;
