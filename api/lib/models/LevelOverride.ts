import Modeler, { Param, GenericListOrder, type GenericList, type GenericListInput } from '@openaddresses/batch-generic';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { InferSelectModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { LevelOverride } from '../schema.js';
import type { ListLevelOverrideQueryType } from '../types.js';

export type LevelOverrideRow = InferSelectModel<typeof LevelOverride>;

export default class LevelOverrideModel extends Modeler<typeof LevelOverride> {
    constructor(pool: PostgresJsDatabase<Record<string, unknown>>) {
        super(pool, LevelOverride);
    }

    /**
     * Return a list of level overrides
     */
    async list(query: Partial<ListLevelOverrideQueryType> & Partial<GenericListInput> = {}): Promise<GenericList<LevelOverrideRow>> {
        return await super.list({
            limit: query.limit || 100,
            page: query.page || 0,
            sort: query.sort || 'created',
            order: (query.order || 'asc') as GenericListOrder,
            where: sql`
                pattern ~ ${query.filter || ''}
                AND (${Param(query.level)}::TEXT IS NULL OR ${Param(query.level)}::TEXT = level)
            `,
        });
    }
}
