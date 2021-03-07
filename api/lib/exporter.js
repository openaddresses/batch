'use strict';

const Err = require('./error');
const { Status } = require('./util');

class Exporter {
    constructor() {
        this.id = false;
        this.uid = false;
        this.job_id = false;
        this.created = false;
        this.expiry = false;
        this.size = 0;
        this.status = false;
        this.loglink = false;

        // Attributes which are allowed to be patched
        this.attrs = Object.keys(require('../schema/req.body.PatchExport.json').properties);
    }

    /**
     * List & Filter Exports
     *
     * @param {Pool} pool - Postgres Pool instance
     * @param {Object} query - Query object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {String} [query.before=undefined] - Only show exports before the given date
     * @param {String} [query.after=undefined] - Only show exports after the given date
     * @param {Number} [query.status=["Success", "Fail", "Pending", "Warn"]] - Only show exports with a given status
     */
    static async list(pool, query) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;
        if (!query.status) query.status = Status.list();

        const where = [];

        Status.verify(query.status);

        if (query.after) {
            try {
                const after = moment(query.after);
                where.push(`exports.created > '${after.toDate().toISOString()}'::TIMESTAMP`);
            } catch (err) {
                throw new Err(400, null, 'after param is not recognized as a valid date');
            }
        }

        if (query.before) {
            try {
                const before = moment(query.before);
                where.push(`exports.created < '${before.toDate().toISOString()}'::TIMESTAMP`);
            } catch (err) {
                throw new Err(400, null, 'before param is not recognized as a valid date');
            }
        }

        if (query.status) {
            where.push(`${query.status.join(',')}}'::TEXT[] @> ARRAY[exports.status]`)
        }

        let pgres;
        try {
            pgres = await pool.query(`
                SELECT
                    exports.id,
                    exports.status,
                    exports.format,
                    exports.created,
                    exports.loglink,
                    exports.size
                FROM
                    exports,
                    job
                WHERE
                    True
                    ${where.length ? ' AND ' + where.join(' AND ') : ''}
                ORDER BY
                    runs.id DESC
                LIMIT $1
            `, [
                query.limit
            ]);
        } catch (err) {
            throw new Err(500, err, 'failed to fetch runs');
        }

        return pgres.rows.map((exp) => {
            exp.id = parseInt(exp.id);
            exp.uid = parseInt(exp.uid);
            exp.job_id = parseInt(exp.job_id);

            return exp;
        });
    }

    static async from(pool, id) {
        try {
            const pgres = await pool.query(`
                SELECT
                    *
                FROM
                    exports
                WHERE
                    id = $1
            `, [id]);

            const exp = new Exporter();

            if (!pgres.rows.length) {
                throw new Err(404, null, 'no exports by that id');
            }

            for (const key of Object.keys(pgres.rows[0])) {
                exp[key] = pgres.rows[0][key];
            }

            return exp;
        } catch (err) {
            throw new Err(500, err, 'failed to fetch export');
        }
    }

    patch(patch) {
        for (const attr of this.attrs) {
            if (patch[attr] !== undefined) {
                this[attr] = patch[attr];
            }
        }
    }

    async commit(pool) {
        try {
            await pool.query(`
                UPDATE exports
                    SET
                        size = $1,
                        status = $2,
                        loglink = $3
           `, [
                this.size,
                this.status,
                this.loglink
            ]);
        } catch (err) {
            throw new Err(500, err, 'failed to save export');
        }

        return this;

    }

    /**
     * Create a new Export
     *
     * @param {Number} uid User ID that created the export
     * @param {Number} job_id Job to export
     * @param {String} format Format to export to
     */
    static async generate(pool, params = {}) {
        let pgres;
        try {
            pgres = pool.query(`
                INSERT INTO exports (
                    uid,
                    job_id,
                    format,
                ) VALUES (
                    $1,
                    $2,
                    $3
                ) RETURNING *
            `, [
                params.uid,
                params.job_id,
                params.format
            ]);
        } catch (err) {
            throw new Err(500, err, 'failed to generate exports');
        }

        const exp = new Exporter();

        pgres.rows[0].id = parseInt(pgres.rows[0].id);
        for (const key of Object.keys(pgres.rows[0])) {
            exp[key] = pgres.rows[0][key];
        }

        return exp;
    }
}

module.exports = Exporter;
