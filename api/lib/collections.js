const { Err } = require('@openaddresses/batch-schema');
const { sql } = require('slonik');
const Generic = require('./generic');

/**
 * @class
 */
class Collection extends Generic {
    static _table = 'collection';
    static _res = require('../schema/res.Collection.json');
    static _patch = require('../schema/req.body.PatchCollection.json');

    static async data(pool, collection_id, res) {
        const collection = await Collection.from(pool, collection_id);
        return res.redirect(`https://v2.openaddresses.io/${process.env.StackName}/collection-${collection.name}.zip`);
    }

    async commit(pool) {
        if (this.id === false) throw new Err(400, null, 'Collection.id must be populated');

        try {
            await pool.query(sql`
                UPDATE collections
                    SET
                        name = ${this.name || null},
                        sources = ${this.sources ? JSON.stringify(this.sources) : null}::JSONB,
                        created = NOW(),
                        size = ${this.size || null}
                    WHERE
                        id = ${this.id}
            `);

            return this;
        } catch (err) {
            if (err instanceof Err) throw err;
            throw new Err(500, err, 'failed to save collection');
        }
    }

    async generate(pool) {
        try {
            const pgres = await pool.query(sql`
                INSERT INTO collections (
                    name,
                    sources,
                    created,
                    size
                ) VALUES (
                    ${this.name},
                    ${JSON.stringify(this.sources)}::JSONB,
                    NOW(),
                    ${this.size || 0}
                ) RETURNING *
            `);

            this.s3 = `s3://${process.env.Bucket}/${process.env.StackName}/collection-${pgres.rows[0].name}.zip`;

            return this.deserialize(this);
        } catch (err) {
            if (err.originalError && err.originalError.code && err.originalError.code === '23505') {
                throw new Err(400, null, 'duplicate collections not allowed');
            }

            throw new Err(500, err, 'failed to generate collection');
        }
    }

    static async list(pool) {
        let pgres;
        try {
            pgres = await pool.query(sql`
                SELECT
                    id,
                    name,
                    created,
                    sources,
                    size
                FROM
                    collections
            `);
        } catch (err) {
            throw new Err(500, err, 'Failed to list collections');
        }

        if (!pgres.rows.length) {
            throw new Err(404, null, 'No collections found');
        }

        return this.deserialize(pgres.rows).collections;
    }
}

module.exports = Collection;
