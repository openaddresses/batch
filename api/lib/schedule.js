'use strict';

const Err = require('./error');
const JobError = require('./joberror');
const batchjob = require('./batch');

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
        } else if (event.type === 'close') {
            // TODO actuall close old jobs and runs
            return {
                status: 200,
                message: 'Closed old jobs/runs'
            };
        }
    }

    static async collect() {
        try {
            return await batchjob({
                type: 'collect'
            });
        } catch (err) {
            throw new Err(500, err, 'failed to submit collect job to batch');
        }
    }

    static async sources(pool) {
        await JobError.clear(pool);

        try {
            return await batchjob({
                type: 'sources'
            });
        }  catch (err) {
            throw new Err(500, err, 'failed to submit sources job to batch');
        }
    }
}

module.exports = Schedule;
