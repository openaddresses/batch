export function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE runs
            ALTER COLUMN created SET DEFAULT Now();

        ALTER TABLE runs
            ALTER COLUMN github SET DEFAULT '{}'::JSONB;

        ALTER TABLE runs
            ALTER COLUMN closed SET DEFAULT False;
    `);
}

export function down(knex) {
    return knex.schema.raw(``);
}
