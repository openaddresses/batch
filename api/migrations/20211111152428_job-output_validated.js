exports.up = function(knex) {
    return knex.schema.raw(`
        UPDATE job
            SET output = output||'{"validated": false}'::JSONB;
    `);
}

exports.down = function(knex) {
    return knex.schema.raw(``);
}
