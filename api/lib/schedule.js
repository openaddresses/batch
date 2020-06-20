'use strict';

const AWS = require('aws-sdk');
const Err = require('./error');
const JobError = require('./joberror');
const lambda = new AWS.Lambda({ region: process.env.AWS_DEFAULT_REGION });

/**
 * @class Schedule
 */
class Schedule {
    static async event(pool, event) {
        if (!event.type) throw new Err(400, null, 'Event.type must be a string');
        if (!['collect', 'sources'].includes(event.type)) throw new Err(400, null, 'Event.body is not a recognized event');

        if (event.type === 'collect') {
            await Schedule.collect();
        } else if (event.type === 'sources') {
            await Schedule.sources(pool);
        }
    }

    static async collect() {
        return new Promise((resolve, reject) => {
            lambda.invoke({
                FunctionName: `${process.env.StackName}-invoke`,
                InvocationType: 'Event',
                LogType: 'Tail',
                Payload: JSON.stringify({
                    type: 'collect'
                })
            }, (err, data) => {
                if (err) return reject(new Err(500, err, 'failed to submit collect job to batch'));

                return resolve(data);
            });
        });
    }

    static async sources(pool) {
        await JobError.clear(pool);

        return new Promise((resolve, reject) => {
            lambda.invoke({
                FunctionName: `${process.env.StackName}-invoke`,
                InvocationType: 'Event',
                LogType: 'Tail',
                Payload: JSON.stringify({
                    type: 'sources'
                })
            }, (err, data) => {
                if (err) return reject(new Err(500, err, 'failed to submit sources job to batch'));

                return resolve(data);
            });
        });
    }
}

module.exports = Schedule;
