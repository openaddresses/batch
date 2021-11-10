const { Err } = require('@openaddresses/batch-schema');
const JobError = require('./joberror');
const batch = require('./batch');
const Level = require('./level');
const { sql } = require('slonik');

/**
 * @class Schedule
 */
class Schedule {
    static async event(pool, event) {
        if (['fabric', 'collect', 'sources'].includes(event.type)) {
            await Schedule.batch(event.type, pool);
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

    /**
     * Generic function for triggering a batch job
     *
     * @param {String} type Type of batch job to trigger
     * @param {Pool} pool Instantiated Postgres Pool
     */
    static async batch(type, pool) {
        if (type === 'sources') await JobError.clear(pool);

        try {
            return await batch.trigger({
                type: type
            });
        } catch (err) {
            throw new Err(500, err, 'Failed to submit job to batch');
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

    static async close(pool) {
        // TODO Close old run/jobs

        await pool.query(sql`
            DELETE FROM
                users_reset
            WHERE
                expires < NOW()
        `);
    }
}

module.exports = Schedule;
