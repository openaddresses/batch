export function up(knex) {
    return knex.schema.raw(`
        DELETE FROM results
        WHERE job IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM job WHERE job.id = results.job
        );

        ALTER TABLE results
        ADD CONSTRAINT results_job_fk
        FOREIGN KEY (job) REFERENCES job(id);
    `);
}

export function down(knex) {
    return knex.schema.raw(`
        ALTER TABLE results DROP CONSTRAINT IF EXISTS results_job_fk;
    `);
}
