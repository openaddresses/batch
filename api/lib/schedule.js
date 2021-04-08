'use strict';

const Err = require('./error');
const JobError = require('./joberror');
const batch = require('./batch');
const Level = require('./level');

/**
 * @class Schedule
 */
class Schedule {
    static async event(pool, event) {
        if (event.type === 'collect') {
            await Schedule.collect();
        } else if (event.type === 'sources') {
            await Schedule.sources(pool);
        } else if (event.type === 'close') {
            await Schedule.close(pool);
        } else if (event.type === 'level') {
            await Schedule.level(pool);
        } else if (event.type === 'scale') {
            await Schedule.scale(pool);
        }
    }

    static async scale() {
        try {
            return await batch.scale_in();
        } catch (err) {
            throw new Err(500, err, 'Failed to scale ASG down');
        }
    }

    static async collect() {
        try {
            return await batch.trigger({
                type: 'collect'
            });
        } catch (err) {
            throw new Err(500, err, 'failed to submit collect job to batch');
        }
    }

    static async level(pool) {
        const level = new Level(pool);

        try {
            await level.all();
        } catch (err) {
            throw new Err(500, err, 'Failed to level all users');
        }
    }

    static async sources(pool) {
        await JobError.clear(pool);

        try {
            return await batch.trigger({
                type: 'sources'
            });
        }  catch (err) {
            throw new Err(500, err, 'failed to submit sources job to batch');
        }
    }

    static async close(pool) {
        // TODO Close old run/jobs

        await pool.query(`
            DELETE FROM
                users_reset
            WHERE
                expires < NOW()
        `);
    }
}

module.exports = Schedule;
