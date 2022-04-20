export function up(knex) {
    return knex.schema.raw(`
        DROP TABLE analytics;
    `);
}

export function down(knex) {
    return knex.schema.raw(``);
}
