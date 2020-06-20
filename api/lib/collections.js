'use strict';
const Err = require('./error');
const S3 = require('./s3');

/**
 * @class Collections
 */
class Collection {
    constructor(name, sources) {
        if (typeof name !== 'string') throw new Err(400, null, 'Collection.name must be a string');
        if (name.length === 0) throw new Err(400, null, 'Collection.name cannot be empty');
        if (!/^[a-z0-9-]+$/.test(name)) throw new Err(400, null, 'Collection.name may only contain a-z 0-9 and -');

        if (!Array.isArray(sources)) throw new Err(400, null, 'Collection.sources must be an array');
        if (sources.length === 0) throw new Err(400, null, 'Collection.sources must be > 0');
        for (const source in sources) {
            if (typeof source !== 'string') {
                throw new Err(400, null, 'Collection.sources array must contain strings');
            }
        }

        this.id = false;
        this.name = name;
        this.sources = sources;
        this.created = false;

        // Attributes which are allowed to be patched
        this.attrs = [
            'created',
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

    static async data(pool, collection_id, res) {
        const collection = await Collection.from(pool, collection_id);

        const s3 = new S3({
            Bucket: process.env.Bucket,
            Key: `${process.env.StackName}/collection-${collection.name}.zip`
        });

        return s3.stream(res, `openaddresses-${collection.name}.zip`);
    }

    static async from(pool, id) {
        try {
            const pgres = await pool.query(`
                SELECT
                    id,
                    name,
                    sources,
                    created
                FROM
                    collections
                WHERE
                    id = $1
            `, [id]);

            pgres.rows[0].id = parseInt(pgres.rows[0].id);

            const collection = new Collection(pgres.rows[0].name, pgres.rows[0].sources);

            for (const key of Object.keys(pgres.rows[0])) {
                collection[key] = pgres.rows[0][key];
            }

            return collection;
        } catch (err) {
            throw new Err(500, err, 'failed to get collection');
        }
    }

    async commit(pool) {
        if (this.id === false) throw new Err(400, null, 'Collection.id must be populated');

        try {
            await pool.query(`
                UPDATE collections
                    SET
                        name = $1,
                        sources = $2::JSONB,
                        created = NOW()
                    WHERE
                        id = $3
            `, [
                this.name,
                JSON.stringify(this.sources),
                this.id
            ]);

            return this;
        } catch (err) {
            throw new Err(500, err, 'failed to save collection');
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
                    $2::JSONB,
                    NOW()
                )
            `, [
                this.name,
                JSON.stringify(this.sources)
            ]);

            pgres.rows[0].id = parseInt(pgres.rows[0].id);

            for (const key of Object.keys(pgres.rows[0])) {
                this[key] = pgres.rows[0][key];
            }

            return this;
        } catch (err) {
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

    static async delete(pool, id) {
        try {
            const pgres = await pool.query(`
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
