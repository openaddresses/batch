import Err from '@openaddresses/batch-error';
import { sql } from 'drizzle-orm';
import type { Pool } from '@openaddresses/batch-generic';
import type * as pgschema from './schema.js';
import type { LicensesResponseType } from './types.js';

interface LicenseGroup {
    attribution: string | null;
    license: string | null;
    url: string | null;
    sources: Array<[string | null, string | null]>;
    seen: Set<string>;
}

/**
 * @class
 */
export default class License {
    /**
     * Return all current results with a real license, grouped by
     * (attribution name, license text) into the shape the openaddresses.io
     * attribution page expects.
     */
    static async list(pool: Pool<typeof pgschema>): Promise<LicensesResponseType> {
        let pgres;
        try {
            pgres = await pool.execute<{ source: string; license: string }>(sql`
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
            throw new Err(500, err instanceof Error ? err : new Error(String(err)), 'Failed to list licenses');
        }

        const groups = new Map<string, LicenseGroup>();

        for (const row of pgres) {
            let license: Record<string, unknown>;
            try {
                license = JSON.parse(row.license);
            } catch {
                continue;
            }

            if (!license || typeof license !== 'object') continue;

            // `attribution` is polymorphic in source JSON: usually a boolean
            // flag ("is attribution required?"), but ~150 sources use it as
            // a legacy attribution-name string instead. Only treat it as a
            // name when it's actually a string - a boolean flag isn't a name.
            const legacyAttribution = typeof license['attribution'] === 'string' ? license['attribution'] : null;
            const attribution = (typeof license['attribution name'] === 'string' ? license['attribution name'] : null) || legacyAttribution || null;
            const text = typeof license.text === 'string' ? license.text : null;
            const url = typeof license.url === 'string' ? license.url : null;
            const website = typeof license.website === 'string' ? license.website : null;
            const key = JSON.stringify([attribution, text]);

            if (!groups.has(key)) {
                groups.set(key, {
                    attribution,
                    license: text,
                    url,
                    sources: [],
                    seen: new Set(),
                });
            }

            const group = groups.get(key)!;
            const sourceKey = row.source;
            if (!group.seen.has(sourceKey)) {
                group.seen.add(sourceKey);
                group.sources.push([`${row.source}.json`, website]);
            }
        }

        return {
            licenses: Array.from(groups.values()).map(group => ({
                attribution: group.attribution,
                license: group.license,
                url: group.url,
                sources: group.sources,
            })),
        };
    }
}
