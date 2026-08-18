import Err from '@openaddresses/batch-error';
import { sql } from 'slonik';

/**
 * @class
 */
export default class License {
    /**
     * Return all current results with a real license, grouped by
     * (attribution name, license text) into the shape the openaddresses.io
     * attribution page expects.
     *
     * @param {Pool} pool Postgres Pool instance
     */
    static async list(pool) {
        let pgres;
        try {
            pgres = await pool.query(sql`
                SELECT
                    results.source,
                    job.license
                FROM
                    results INNER JOIN job ON results.job = job.id
                WHERE
                    job.license IS NOT NULL
                    AND lower(job.license) != 'false'
                ORDER BY
                    results.source,
                    results.layer,
                    results.name
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to list licenses');
        }

        const groups = new Map();

        for (const row of pgres.rows) {
            let license;
            try {
                license = JSON.parse(row.license);
            } catch {
                continue;
            }

            if (!license || typeof license !== 'object') continue;

            const attribution = license['attribution name'] || null;
            const text = license.text || null;
            const website = license.website || null;
            const key = JSON.stringify([attribution, text]);

            if (!groups.has(key)) {
                groups.set(key, {
                    attribution,
                    license: text,
                    sources: [],
                    seen: new Set()
                });
            }

            const group = groups.get(key);
            const sourceKey = row.source;
            if (!group.seen.has(sourceKey)) {
                group.seen.add(sourceKey);
                group.sources.push([`${row.source}.json`, website]);
            }
        }

        return {
            licenses: Array.from(groups.values()).map((group) => ({
                attribution: group.attribution,
                license: group.license,
                sources: group.sources
            }))
        };
    }
}
