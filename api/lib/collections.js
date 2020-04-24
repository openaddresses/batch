'use strict';
const Err = require('./error');

/**
 * @class Collections
 */
class Collections {
    static async list(pool) {
        let pgres;
        try {
            pgres = await pool.query(`
                SELECT
                    id,
                    name,
                    created
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

module.exports = Collections;
