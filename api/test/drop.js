import { Pool } from '@openaddresses/batch-generic';
import { sql } from 'drizzle-orm';

export default async function drop() {
    const pool = await Pool.connect(process.env.Postgres || 'postgres://postgres@localhost:5432/openaddresses_test', {});

    const pgres = await pool.execute(sql`
        SELECT
            'drop table "' || tablename || '" cascade;' AS drop
        FROM
            pg_tables
        WHERE
            schemaname = 'public'
            AND tablename != 'spatial_ref_sys'
    `);

    for (const r of pgres) {
        await pool.execute(sql.raw(r.drop));
    }

    await pool.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);

    await pool.end();
}
