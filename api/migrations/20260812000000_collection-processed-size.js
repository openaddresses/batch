export function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE collections
            ADD COLUMN processed_size BIGINT;
    `);
}

export function down(knex) {
    return knex.schema.raw(`
        ALTER TABLE collections
            DROP COLUMN processed_size;
    `);
}
