import Err from '@openaddresses/batch-error';
import {
    scale_in,
    trigger,
} from './batch.js';
import Level from './level.js';
import { sql } from 'drizzle-orm';
import type Config from './config.js';
import type { Pool } from '@openaddresses/batch-generic';
import type * as pgschema from './schema.js';
import type { ScheduleBodyType } from './types.js';

/**
 * @class
 */
export default class Schedule {
    static async event(config: Config, event: ScheduleBodyType): Promise<void> {
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
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Failed to scale ASG down');
        }
    }

    /**
     * Generic function for triggering a batch job
     */
    static async batch(type: string, config: Config) {
        if (type === 'sources') await config.models.JobError.clear();

        try {
            return await trigger({
                type: type,
            });
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Failed to submit job to batch');
        }
    }

    static async level(pool: Pool<typeof pgschema>): Promise<void> {
        const level = new Level(pool);

        try {
            await level.all();
        } catch (err) {
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Failed to level all users');
        }
    }

    static async close(pool: Pool<typeof pgschema>): Promise<void> {
        // TODO Close old run/jobs

        await pool.execute(sql`
            DELETE FROM
                users_reset
            WHERE
                expires < NOW()
        `);
    }
}
