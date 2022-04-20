export function up(knex) {
    return knex.schema.raw(`
        UPDATE job
            SET output = output||'{"validated": false}'::JSONB;
    `);
}

export function down(knex) {
    return knex.schema.raw(``);
}
