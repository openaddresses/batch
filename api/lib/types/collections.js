import fs from 'fs';
import Err from '@openaddresses/batch-error';
import Generic from '@openaddresses/batch-generic';
import { sql } from 'slonik';

/**
 * @class
 */
export default class Collection extends Generic {
    static _table = 'collections';

    static async list(pool) {
        let pgres;
        try {
            pgres = await pool.query(sql`
                SELECT
                    *
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

    _s3() {
        this.s3 = `s3://${process.env.Bucket}/${process.env.StackName}/collection-${this.name}.zip`;
    }

}
