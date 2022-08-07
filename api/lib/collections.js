import fs from 'fs';
import { Err } from '@openaddresses/batch-schema';
import Generic from '@openaddresses/batch-generic';
import { sql } from 'slonik';

/**
 * @class
 */
export default class Collection extends Generic {
    static _table = 'collections';
    static _res = JSON.parse(fs.readFileSync(new URL('../schema/res.Collection.json', import.meta.url)));
    static _patch = JSON.parse(fs.readFileSync(new URL('../schema/req.body.PatchCollection.json', import.meta.url)));

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
            throw new Err(500, new Error(err), 'Failed to list collections');
        }

        if (!pgres.rows.length) {
            throw new Err(404, null, 'No collections found');
        }

        return pgres.rows.map((res) => {
            res.s3 = `s3://${process.env.Bucket}/${process.env.StackName}/collection-${res.name}.zip`;
            return res;
        });
    }

    static async data(pool, collection_id, res) {
        const collection = await Collection.from(pool, collection_id);
        return res.redirect(`https://v2.openaddresses.io/${process.env.StackName}/collection-${collection.name}.zip`);
    }

    _s3() {
        this.s3 = `s3://${process.env.Bucket}/${process.env.StackName}/collection-${this.name}.zip`;
    }

}
