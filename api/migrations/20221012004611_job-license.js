export function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE job
            ALTER COLUMN license SET DEFAULT False;
    `);
}

export function down(knex) {
    return knex.schema.raw(``);
}
