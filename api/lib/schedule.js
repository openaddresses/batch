const Err = require('./error');
const JobError = require('./joberror');
const batch = require('./batch');
const Level = require('./level');
const { sql } = require('slonik');

/**
 * @class Schedule
 */
class Schedule {
    static async event(pool, event) {
        if (event.type === 'collect') {
            await Schedule.collect();
        } else if (['fabric', 'collect', 'sources'].includes(event.type)) {
            await Schedule.batch(event.type);
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
     * @param {String} type Type of batch job to trigger
     */
    static async batch(type) {
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
