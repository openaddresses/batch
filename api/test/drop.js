import PG from 'pg';
const Pool = PG.Pool;

export default async function drop() {
    const pool = new Pool({
        connectionString: process.env.Postgres || 'postgres://postgres@localhost:5432/openaddresses_test'
    });

    const pgres = await pool.query(`
        SELECT
            'drop table "' || tablename || '" cascade;' AS drop
        FROM
            pg_tables
        WHERE
            schemaname = 'public'
            AND tablename != 'spatial_ref_sys'
    `);

    for (const r of pgres.rows) {
        await pool.query(r.drop);
    }

    await pool.end();
}
