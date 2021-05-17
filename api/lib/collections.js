'use strict';
const Err = require('./error');

/**
 * @class Collections
 */
class Collection {
    constructor(name, sources) {
        if (typeof name !== 'string') throw new Err(400, null, 'Collection.name must be a string');
        if (name.length === 0) throw new Err(400, null, 'Collection.name cannot be empty');
        if (!/^[a-z0-9-]+$/.test(name)) throw new Err(400, null, 'Collection.name may only contain a-z 0-9 and -');

        if (!Array.isArray(sources)) throw new Err(400, null, 'Collection.sources must be an array');
        for (const source of sources) {
            if (typeof source !== 'string') {
                throw new Err(400, null, 'Collection.sources array must contain strings');
            }
        }

        this.id = false;
        this.name = name;
        this.sources = sources;
        this.created = false;
        this.size = 0;
        this.s3 = false;

        // Attributes which are allowed to be patched
        this.attrs = Object.keys(require('../schema/req.body.PatchCollection.json').properties);
    }

    json() {
        return {
            id: parseInt(this.id),
            s3: this.s3,
            size: parseInt(this.size),
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

    static async data(pool, collection_id, res) {
        const collection = await Collection.from(pool, collection_id);

        return res.redirect(`https://v2.openaddresses.io/${process.env.StackName}/collection-${collection.name}.zip`);
    }

    static async from(pool, id) {
        try {
            const pgres = await pool.query(`
                SELECT
                    id,
                    name,
                    sources,
                    created,
                    size
                FROM
                    collections
                WHERE
                    id = $1
            `, [id]);

            if (pgres.rows.length === 0) throw new Err(404, null, 'collection not found');

            pgres.rows[0].id = parseInt(pgres.rows[0].id);
            pgres.rows[0].size = parseInt(pgres.rows[0].size);

            const collection = new Collection(pgres.rows[0].name, pgres.rows[0].sources);

            for (const key of Object.keys(pgres.rows[0])) {
                collection[key] = pgres.rows[0][key];
            }

            collection.s3 = `s3://${process.env.Bucket}/${process.env.StackName}/collection-${collection.name}.zip`;

            return collection;
        } catch (err) {
            if (err instanceof Err) throw err;
            throw new Err(500, err, 'failed to get collection');
        }
    }

    async commit(pool) {
        if (this.id === false) throw new Err(400, null, 'Collection.id must be populated');

        try {
            await pool.query(`
                UPDATE collections
                    SET
                        name = COALESCE($1, name),
                        sources = COALESCE($2::JSONB, sources),
                        created = NOW(),
                        size = COALESCE($3, size)
                    WHERE
                        id = $4
            `, [
                this.name,
                JSON.stringify(this.sources),
                this.size,
                this.id
            ]);

            return this;
        } catch (err) {
            if (err instanceof Err) throw err;
            throw new Err(500, err, 'failed to save collection');
        }
    }

    async generate(pool) {
        try {
            const pgres = await pool.query(`
                INSERT INTO collections (
                    name,
                    sources,
                    created,
                    size
                ) VALUES (
                    $1,
                    $2::JSONB,
                    NOW(),
                    $3
                ) RETURNING *
            `, [
                this.name,
                JSON.stringify(this.sources),
                this.size || 0
            ]);

            pgres.rows[0].id = parseInt(pgres.rows[0].id);
            pgres.rows[0].size = parseInt(pgres.rows[0].size);

            for (const key of Object.keys(pgres.rows[0])) {
                this[key] = pgres.rows[0][key];
            }

            this.s3 = `s3://${process.env.Bucket}/${process.env.StackName}/collection-${pgres.rows[0].name}.zip`;

            return this;
        } catch (err) {
            if (err.code && err.code === '23505') {
                throw new Err(400, null, 'duplicate collections not allowed');
            }

            throw new Err(500, err, 'failed to generate collection');
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

        return pgres.rows.map((res) => {
            res.id = parseInt(res.id);
            res.s3 = `s3://${process.env.Bucket}/${process.env.StackName}/collection-${res.name}.zip`;
            res.size = parseInt(res.size);
            return res;
        });
    }

    static async delete(pool, id) {
        try {
            await pool.query(`
                DELETE FROM
                    collections
                WHERE
                    id = $1
            `, [id]);
        } catch (err) {
            throw new Err(500, err, 'Failed to delete collection');
        }

    }
}

module.exports = Collection;
