// Indexes supporting the weekly cleanup task's queries (task/cleanup.js):
//  - job(status, id): Job.list() filters on job.status and (by default) orders/
//    keyset-paginates on job.id - used heavily by pruneFailedJobs.
//  - job(created): Job.list()'s before/after filters and Job.orphaned()'s
//    before filter, both currently unindexed.
//  - job(source_name, layer, name): Data.history()'s join from results to job -
//    pruneByRetention calls this once per active source (~5k sequential calls),
//    each of which was doing a full seq scan of job to find the match.
//  - job(run): Run.list()'s LEFT JOIN job ON job.run = runs.id, used by
//    pruneNonLiveRuns/sweepEmptyRuns.
//  - results(source, layer, name): Job.orphaned()'s NOT EXISTS anti-join
//    against results, evaluated per candidate job row.
//  - runs(live): Run.list()'s live filter, used by pruneNonLiveRuns.
//
// CREATE INDEX CONCURRENTLY is used so this doesn't take a blocking lock
// against the live job/runs/results tables. That requires each statement to
// run outside of a transaction - both via knex's per-migration `transaction:
// false` config below, *and* by issuing each CREATE/DROP INDEX as its own
// knex.schema.raw() call: a single raw() call containing multiple
// semicolon-separated statements is sent to Postgres as one "simple query"
// message, which Postgres itself implicitly wraps in a transaction
// regardless of the knex-level transaction setting - and CONCURRENTLY is not
// allowed inside any transaction block.
export const config = { transaction: false };

const indexes = [
    ['job_status_id_idx', 'job(status, id)'],
    ['job_created_idx', 'job(created)'],
    ['job_source_name_layer_name_idx', 'job(source_name, layer, name)'],
    ['job_run_idx', 'job(run)'],
    ['results_source_layer_name_idx', 'results(source, layer, name)'],
    ['runs_live_idx', 'runs(live)']
];

export async function up(knex) {
    for (const [name, on] of indexes) {
        await knex.schema.raw(`CREATE INDEX CONCURRENTLY IF NOT EXISTS ${name} ON ${on}`);
    }
}

export async function down(knex) {
    for (const [name] of indexes) {
        await knex.schema.raw(`DROP INDEX CONCURRENTLY IF EXISTS ${name}`);
    }
}
