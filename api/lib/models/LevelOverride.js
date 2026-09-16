import Modeler, { Param } from '@openaddresses/batch-generic';
import { sql } from 'drizzle-orm';
import { LevelOverride } from '../schema.js';

export default class LevelOverrideModel extends Modeler {
    constructor(pool) {
        super(pool, LevelOverride);
    }

    /**
     * Return a list of level overrides
     *
     * @param {Object} query - Query Object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.page=0] - Page of users to return
     * @param {String} [query.filter=] - Name to filter by
     * @param {String} [query.level=] - Level to filter by
     * @param {String} [query.sort=created] Field to sort by
     * @param {String} [query.order=asc] Sort Order (asc/desc)
     */
    async list(query = {}) {
        return await super.list({
            limit: query.limit || 100,
            page: query.page || 0,
            sort: query.sort || 'created',
            order: query.order || 'asc',
            where: sql`
                pattern ~ ${query.filter || ''}
                AND (${Param(query.level)}::TEXT IS NULL OR ${Param(query.level)}::TEXT = level)
            `
        });
    }
}
