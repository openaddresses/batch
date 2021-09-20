

const Err = require('./error');
const Generic = require('./generic');
const { sql } = require('slonik');

/**
 * @class
 */
class LevelOverride extends Generic {
    static _table = 'level_override';

    constructor() {
        super();

        this._table = LevelOverride._table;

        // Attributes which are allowed to be patched
        this.attrs = Object.keys(require('../schema/req.body.PatchLevelOverride.json').properties);
    }

    /**
     * Return a list of level overrides
     *
     * @param {Pool} pool - Instantiated Postgres Pool
     *
     * @param {Object} query - Query Object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.page=0] - Page of users to return
     * @param {String} [query.filter=] - Name to filter by
     * @param {String} [query.level=] - Level to filter by
     * @param {String} [query.sort=created] Field to sort by
     * @param {String} [query.order=asc] Sort Order (asc/desc)
     */
    static async list(pool, query) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;
        if (!query.page) query.page = 0;
        if (!query.filter) query.filter = '';
        if (!query.level) query.level = null;

        if (!query.sort) query.sort = 'created';
        if (!query.order || query.order === 'asc') {
            query.order = sql`asc`;
        } else {
            query.order = sql`desc`;
        }

        let pgres;
        try {
            pgres = await pool.query(sql`
                SELECT
                    count(*) OVER() AS count,
                    id,
                    created,
                    updated,
                    level,
                    pattern
                FROM
                    level_override
                WHERE
                    pattern ~ ${query.filter}
                    AND (${query.level}::TEXT IS NULL or ${query.level}::TEXT = level)
                ORDER BY
                    ${sql.identifier(['level_override', query.sort])} ${query.order}
                LIMIT
                    ${query.limit}
                OFFSET
                    ${query.limit * query.page}
            `);
        } catch (err) {
            throw new Err(500, err, 'Internal LevelOverride Error');
        }

        return this.deserialize(pgres.rows);
    }

    serialize() {
        return {
            id: this.id,
            created: this.created,
            updated: this.updated,
            level: this.level,
            pattern: this.pattern
        };
    }

    async commit(pool) {
        if (this.id === false) throw new Err(500, null, 'Project.id must be populated');

        try {
            await pool.query(sql`
                UPDATE level_override
                    SET
                        pattern     = ${this.pattern},
                        level       = ${this.level},
                        updated     = NOW()
                    WHERE
                        id = ${this.id}
            `);

            return this;
        } catch (err) {
            throw new Err(500, err, 'Failed to save Level Override');
        }
    }

    static async generate(pool, prj) {
        try {
            const pgres = await pool.query(sql`
                INSERT INTO level_override (
                    level,
                    pattern
                ) VALUES (
                    ${prj.level},
                    ${prj.pattern}
                ) RETURNING *
            `);

            return LevelOverride.deserialize(pgres.rows[0]);
        } catch (err) {
            throw new Err(500, err, 'Failed to generate Level Override');
        }
    }
}

module.exports = LevelOverride;
