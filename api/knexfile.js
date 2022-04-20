export default {
    client: 'postgresql',
    connection: process.env.POSTGRES || 'postgres://postgres@localhost:5432/openaddresses',
    pool: {
        min: 2,
        max: 10
    },
    migrations: {
        tableName: 'knex_migrations',
        stub: 'migrations/migration.stub',
        directory: new URL('./migrations', import.meta.url)
    }
};
