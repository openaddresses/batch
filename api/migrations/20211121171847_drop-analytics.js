exports.up = function(knex) {
    return knex.schema.raw(`
        DROP TABLE analytics;
    `);
}

exports.down = function(knex) {
    return knex.schema.raw(``);
}
