export function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE job ALTER COLUMN created SET DEFAULT Now();
        ALTER TABLE job ALTER COLUMN stats SET DEFAULT '{}'::JSONB;
        ALTER TABLE job ALTER COLUMN status SET DEFAULT 'Pending';
    `);
}

export function down(knex) {
    return knex.schema.raw(``);
}
