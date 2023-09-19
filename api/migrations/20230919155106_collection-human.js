export function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE collections
            ADD COLUMN human TEXT;

        UPDATE collections
            SET human = 'Canada'
            WHERE id = 6;

        UPDATE collections
            SET human = 'US Midwest'
            WHERE id = 5;

        UPDATE collections
            SET human = 'US West'
            WHERE id = 4;

        UPDATE collections
            SET human = 'US South'
            WHERE id = 3;

        UPDATE collections
            SET human = 'US Northeast'
            WHERE id = 2;

        UPDATE collections
            SET human = 'Global'
            WHERE id = 1;
    `);
}

export function down(knex) {
    return knex.schema.raw(``);
}
