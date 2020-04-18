'use strict';

const JobError = require('./joberror');

/**
 * @class Schedule
 */
class Schedule {
    static async event(pool) {
        await JobError.clear(pool);
    }
}

module.exports = Schedule;
