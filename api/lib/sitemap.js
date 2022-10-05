import Err from '@openaddresses/batch-error';
import { sql } from 'slonik';

/**
 * @class
 */
export default class SiteMap {
    static async list(pool) {
        try {
            let map = `
                <?xml version="1.0" encoding="UTF-8"?>
                <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
                    <url>
                         <loc>https://batch.openaddresses.io/data</loc>
                         <changefreq>monthly</changefreq>
                    </url>
            `.trim();

            const pgres = await pool.query(sql`
                SELECT
                    id,
                    code,
                    name
                FROM
                    map
            `);

            for (const loc of pgres.rows) {
                map = map + `
                    <url>
                         <loc>https://batch.openaddresses.io/location/${loc.id}</loc>
                         <changefreq>weekly</changefreq>
                    </url>
                `;
            }

            return map + '</urlset>';
        } catch (err) {
            throw new Err(500, err, 'Failed to generate sitemap');
        }
    }
}
