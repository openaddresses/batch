'use strict';
const Err = require('./error');

/**
 * @class Collections
 */
class Collection {
    constructor(name, sources) {
        if (typeof name !== 'string') throw new Error('Collection.name must be a string');
        if (!Array.isArray(sources)) throw new Error('Collection.sources must be an array');
        for (const source in sources) {
            if (typeof source !== 'string') {
                throw new Error('Collection.sources array must contain strings');
            }
        }

        this.id = false;
        this.name = name;
        this.sources = sources;
        this.created = false;

        // Attributes which are allowed to be patched
        this.attrs = [
            'name',
            'sources'
        ];
    }

    json() {
        return {
            id: parseInt(this.id),
            name: this.name,
            sources: this.sources,
            created: this.created
        };
    }

    patch(patch) {
        for (const attr of this.attrs) {
            if (patch[attr] !== undefined) {
                this[attr] = patch[attr];
            }
        }
    }

    async commit(pool) {
        if (this.id === false) throw new Err(500, null, 'Collection.id must be populated');

        try {
            await pool.query(`
                UPDATE collections
                    SET
                        name = $1,
                        sources = $2,
                        created = NOW()
                    WHERE
                        id = $3
            `, [
                this.name,
                this.sources,
                this.id
            ]);

            return this;
        } catch (err) {
            throw new Err(500, 'err', 'failed to save collection');
        }
    }

    async generate(pool) {
        if (!this.name) throw new Err(400, null, 'Cannot generate a collection without a name');
        if (!this.sources) throw new Err(400, null, 'Cannot generate a collection without sources');

        try {
            const pgres = await pool.query(`
                INSERT INTO collections (
                    name,
                    sources,
                    created
                ) VALUES (
                    $1,
                    $2,
                    NOW()
                )
            `, [
                this.name,
                this.sources
            ]);

            pgres.rows[0].id = parseInt(pgres.rows[0].id);

            for (const key of Object.keys(pgres.rows[0])) {
                this[key] = pgres.rows[0][key];
            }

            return this;
        } catch (err) {
            throw new Err(500, 'err', 'failed to generate collection');
        }
    }

    static async list(pool) {
        let pgres;
        try {
            pgres = await pool.query(`
                SELECT
                    id,
                    name,
                    created,
                    sources
                FROM
                    collections
            `);
        } catch (err) {
            throw new Err(500, err, 'Failed to list collections');
        }

        if (!pgres.rows.length) {
            throw new Err(404, null, 'No collections found');
        }

        return pgres.rows.map((res) => {
            res.id = parseInt(res.id);
            return res;
        });
    }
}

module.exports = Collection;
