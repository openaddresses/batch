exports.up = function(knex) {
    return knex.schema.raw(`
        CREATE INDEX IF NOT EXISTS job_map_idx ON job(map);
        CREATE INDEX IF NOT EXISTS map_pkey ON map(id);
        CREATE INDEX IF NOT EXISTS results_pkey ON results(id);
    `);
}

exports.down = function(knex) {
    return knex.schema.raw(``);
}
