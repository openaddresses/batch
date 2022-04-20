exports.up = function(knex) {
    return knex.schema.raw(`
        CREATE TABLE IF NOT EXISTS level_override (
            id          BIGSERIAL,
            created     TIMESTAMP DEFAULT NOW(),
            updated     TIMESTAMP DEFAULT NOW(),
            level       TEXT NOT NULL,
            pattern     TEXT NOT NULL
        );
    `);
}

exports.down = function(knex) {
    return knex.schema.raw(`
        DROP TABLE level_override;
    `);
}
