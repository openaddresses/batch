import Err from '@openaddresses/batch-error';
import {
    scale_in,
    trigger
} from './batch.js';
import Level from './level.js';
import { sql } from 'drizzle-orm';

/**
 * @class
 */
export default class Schedule {
    static async event(config, event) {
        if (['fabric', 'collect', 'sources', 'cleanup'].includes(event.type)) {
            await Schedule.batch(event.type, config);
        } else if (event.type === 'close') {
            await Schedule.close(config.pool);
        } else if (event.type === 'level') {
            await Schedule.level(config.pool);
        } else if (event.type === 'scale') {
            await Schedule.scale();
        }
    }

    static async scale() {
        try {
            return await scale_in();
        } catch (err) {
            throw new Err(500, err, 'Failed to scale ASG down');
        }
    }

    /**
     * Generic function for triggering a batch job
     *
     * @param {String} type Type of batch job to trigger
     * @param {Config} config Server config
     */
    static async batch(type, config) {
        if (type === 'sources') await config.models.JobError.clear();

        try {
            return await trigger({
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

        await pool.execute(sql`
            DELETE FROM
                users_reset
            WHERE
                expires < NOW()
        `);
    }
}
