import { interactive } from './lib/pre.js';
import { PromisePool } from '@supercharge/promise-pool';
import S3 from '@aws-sdk/client-s3';
import minimist from 'minimist';

const args = minimist(process.argv, {
    boolean: ['interactive', 'dry-run'],
    alias: {
        interactive: 'i'
    }
});

if (import.meta.url === `file://${process.argv[1]}`) {
    if (args.interactive) {
        await interactive();
    }
    cli();
}

async function cli() {
    if (!process.env.StackName) process.env.StackName = 'batch-prod';
    if (!process.env.Bucket) process.env.Bucket = 'v2.openaddresses.io';
    if (!process.env.SharedSecret) throw new Error('No SharedSecret env var defined');
    if (!process.env.OA_API) throw new Error('No OA_API env var defined');

    const dryRun = args['dry-run'];
    if (dryRun) console.error('ok - DRY RUN MODE');

    const OA = (await import('@openaddresses/lib')).default;
    const oa = new OA({
        url: process.env.OA_API,
        secret: process.env.SharedSecret
    });

    const s3 = new S3.S3Client({ region: process.env.AWS_DEFAULT_REGION });
    const r2 = new S3.S3Client({
        region: 'auto',
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
        },
        endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
    });

    const stats = { kept: 0, pruned: 0, errors: 0, deduped: 0, orphaned: 0, failed: 0 };

    try {
        await pruneByRetention(oa, s3, r2, dryRun, stats);
        await pruneOrphanedJobs(oa, s3, r2, dryRun, stats);
        await pruneFailedJobs(oa, s3, r2, dryRun, stats);
        await pruneNonLiveRuns(oa, s3, r2, dryRun, stats);
        await sweepEmptyRuns(oa, dryRun, stats);

        console.error([
            'ok - cleanup complete:',
            `kept=${stats.kept}`,
            `pruned=${stats.pruned}`,
            `deduped=${stats.deduped}`,
            `orphaned=${stats.orphaned}`,
            `failed=${stats.failed}`,
            `errors=${stats.errors}`
        ].join(' '));
    } catch (err) {
        console.error(err);
        throw err;
    }
}

// ---- Retention-based pruning of live successful jobs ----

async function pruneByRetention(oa, s3, r2, dryRun, stats) {
    const datas = await oa.cmd('data', 'list');
    console.error(`ok - found ${datas.length} active sources`);

    for (const data of datas) {
        try {
            const history = await oa.cmd('data', 'history', { ':data': data.id });
            const jobs = history.jobs || [];
            if (jobs.length === 0) continue;

            const toPrune = selectJobsToPrune(jobs, data.job);
            stats.kept += jobs.length - toPrune.length;

            if (toPrune.length === 0) continue;

            const toDelete = [];
            for (const job of toPrune) {
                if (job._reason === 'duplicate') stats.deduped++;
                stats.pruned++;
                toDelete.push(job);
            }

            await deleteJobsBatch(oa, s3, r2, toDelete, dryRun, stats);
        } catch (err) {
            console.error(`not ok - error processing data ${data.id} (${data.source}): ${err.message}`);
            stats.errors++;
        }
    }
}

/**
 * Retention policy:
 * - Always keep the active job (referenced by results.job)
 * - Keep all jobs from the last 3 months
 * - Keep 1 job per month for 3-12 months
 * - Keep 1 job per year beyond 12 months
 * - Remove duplicates: same count + size as newer neighbor
 */
function selectJobsToPrune(jobs, activeJobId) {
    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // First pass: mark duplicates (same count + size as newer neighbor)
    const duplicates = new Set();
    for (let i = 1; i < jobs.length; i++) {
        if (jobs[i].id === activeJobId) continue;
        if (jobs[i].count === jobs[i - 1].count && jobs[i].size === jobs[i - 1].size) {
            duplicates.add(jobs[i].id);
        }
    }

    // Second pass: time-based retention on non-duplicates
    const kept = new Set();
    kept.add(activeJobId);

    const monthlyKept = new Map();
    const yearlyKept = new Map();

    for (const job of jobs) {
        if (job.id === activeJobId) { kept.add(job.id); continue; }
        if (duplicates.has(job.id)) continue;

        const created = new Date(job.created);

        if (created >= threeMonthsAgo) {
            kept.add(job.id);
        } else if (created >= twelveMonthsAgo) {
            const bucket = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyKept.has(bucket)) {
                monthlyKept.set(bucket, job.id);
                kept.add(job.id);
            }
        } else {
            const bucket = `${created.getFullYear()}`;
            if (!yearlyKept.has(bucket)) {
                yearlyKept.set(bucket, job.id);
                kept.add(job.id);
            }
        }
    }

    return jobs
        .filter((j) => !kept.has(j.id))
        .map((j) => {
            j._reason = duplicates.has(j.id) ? 'duplicate' : 'retention';
            return j;
        });
}

// ---- Orphaned job cleanup ----

async function pruneOrphanedJobs(oa, s3, r2, dryRun, stats) {
    console.error('ok - cleaning up orphaned jobs');

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const before = threeMonthsAgo.toISOString().split('T')[0];

    let page = 0;
    while (true) {
        const result = await oa.cmd('job', 'orphaned', { before, limit: 100, page });
        const jobs = result.jobs || [];
        if (jobs.length === 0) break;

        const toDelete = jobs.map((j) => ({ ...j, _reason: 'orphaned' }));
        stats.orphaned += toDelete.length;
        await deleteJobsBatch(oa, s3, r2, toDelete, dryRun, stats);

        if (jobs.length < 100) break;
        page++;
    }
}

// ---- Failed job cleanup ----

async function pruneFailedJobs(oa, s3, r2, dryRun, stats) {
    console.error('ok - cleaning up old failed jobs');

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const before = threeMonthsAgo.toISOString().split('T')[0];

    let page = 0;
    while (true) {
        const result = await oa.cmd('job', 'list', { status: 'Fail', before, live: true, limit: 100, page });
        const jobs = result.jobs || [];
        if (jobs.length === 0) break;

        const toDelete = jobs.map((j) => ({ ...j, _reason: 'failed' }));
        stats.failed += toDelete.length;
        await deleteJobsBatch(oa, s3, r2, toDelete, dryRun, stats);

        if (jobs.length < 100) break;
        page++;
    }
}

// ---- Non-live run cleanup ----

async function pruneNonLiveRuns(oa, s3, r2, dryRun, stats) {
    console.error('ok - cleaning up non-live runs');

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const before = sevenDaysAgo.toISOString().split('T')[0];

    let page = 0;
    while (true) {
        const result = await oa.cmd('run', 'list', { live: false, before, limit: 100, page });
        const runs = result.runs || [];
        if (runs.length === 0) break;

        for (const run of runs) {
            try {
                const runJobs = await oa.cmd('run', 'jobs', { ':run': run.id });
                const jobs = runJobs.jobs || runJobs || [];

                if (jobs.length === 0) continue;

                const toDelete = jobs.map((j) => ({ ...j, _reason: 'non-live' }));
                stats.pruned += toDelete.length;
                await deleteJobsBatch(oa, s3, r2, toDelete, dryRun, stats);
            } catch (err) {
                console.error(`not ok - error cleaning non-live run ${run.id}: ${err.message}`);
                stats.errors++;
            }
        }

        if (runs.length < 100) break;
        page++;
    }
}

// ---- Empty run sweep ----

async function sweepEmptyRuns(oa, dryRun, stats) {
    console.error('ok - sweeping empty runs');

    let page = 0;
    let swept = 0;
    while (true) {
        const result = await oa.cmd('run', 'list', { limit: 100, page });
        const runs = result.runs || [];
        if (runs.length === 0) break;

        for (const run of runs) {
            if (run.jobs === 0 || run.jobs === null) {
                if (dryRun) {
                    console.error(`dry-run - would delete empty run ${run.id}`);
                } else {
                    try {
                        await oa.cmd('run', 'delete', { ':run': run.id });
                        console.error(`ok - deleted empty run ${run.id}`);
                        swept++;
                    } catch (err) {
                        console.error(`not ok - failed to delete run ${run.id}: ${err.message}`);
                        stats.errors++;
                    }
                }
            }
        }

        if (runs.length < 100) break;
        page++;
    }

    console.error(`ok - swept ${swept} empty runs`);
}

// ---- Batch deletion with concurrency ----

/**
 * Delete a batch of jobs: S3 assets, R2 assets, then DB rows.
 * Uses DeleteObjects (up to 1000 keys) and PromisePool for concurrency.
 * If S3 or R2 fails for a job, skip the DB delete — next week retries.
 */
async function deleteJobsBatch(oa, s3, r2, jobs, dryRun, stats) {
    if (dryRun) {
        for (const job of jobs) {
            console.error(`dry-run - would delete job ${job.id} (${job._reason})`);
        }
        return;
    }

    // Build per-job key lists
    const jobKeys = jobs.map((job) => {
        const prefix = `${process.env.StackName}/job/${job.id}/`;
        const r2Prefix = `v2.openaddresses.io/${prefix}`;
        const keys = [];
        if (job.output?.cache) keys.push('cache.zip');
        if (job.output?.output) keys.push('source.geojson.gz');
        if (job.output?.validated) keys.push('validated.geojson.gz');
        if (job.output?.preview) keys.push('source.png');
        if (job.output?.pmtiles) keys.push('source.pmtiles');
        return {
            job,
            s3Keys: keys.map((k) => ({ Key: `${prefix}${k}` })),
            r2Keys: keys.map((k) => ({ Key: `${r2Prefix}${k}` }))
        };
    });

    // Batch S3 deletes (up to 1000 keys per call)
    const allS3Keys = jobKeys.flatMap((jk) => jk.s3Keys);
    const s3Failed = new Set();
    for (let i = 0; i < allS3Keys.length; i += 1000) {
        const batch = allS3Keys.slice(i, i + 1000);
        try {
            const result = await s3.send(new S3.DeleteObjectsCommand({
                Bucket: process.env.Bucket,
                Delete: { Objects: batch, Quiet: true }
            }));
            if (result.Errors) {
                for (const err of result.Errors) {
                    console.error(`not ok - s3 delete failed: ${err.Key}: ${err.Message}`);
                    const match = err.Key.match(/job\/(\d+)\//);
                    if (match) s3Failed.add(parseInt(match[1]));
                }
            }
        } catch (err) {
            console.error(`not ok - s3 batch delete failed: ${err.message}`);
            for (const key of batch) {
                const match = key.Key.match(/job\/(\d+)\//);
                if (match) s3Failed.add(parseInt(match[1]));
            }
        }
    }

    // Batch R2 deletes (up to 1000 keys per call)
    const allR2Keys = jobKeys.flatMap((jk) => jk.r2Keys);
    const r2Failed = new Set();
    for (let i = 0; i < allR2Keys.length; i += 1000) {
        const batch = allR2Keys.slice(i, i + 1000);
        try {
            const result = await r2.send(new S3.DeleteObjectsCommand({
                Bucket: process.env.R2Bucket,
                Delete: { Objects: batch, Quiet: true }
            }));
            if (result.Errors) {
                for (const err of result.Errors) {
                    console.error(`not ok - r2 delete failed: ${err.Key}: ${err.Message}`);
                    const match = err.Key.match(/job\/(\d+)\//);
                    if (match) r2Failed.add(parseInt(match[1]));
                }
            }
        } catch (err) {
            console.error(`not ok - r2 batch delete failed: ${err.message}`);
            for (const key of batch) {
                const match = key.Key.match(/job\/(\d+)\//);
                if (match) r2Failed.add(parseInt(match[1]));
            }
        }
    }

    // Delete DB rows only for jobs where both S3 and R2 succeeded
    await PromisePool
        .for(jobs)
        .withConcurrency(20)
        .process(async (job) => {
            if (s3Failed.has(job.id) || r2Failed.has(job.id)) {
                console.error(`not ok - skipping db delete for job ${job.id}: storage delete failed, will retry next run`);
                stats.errors++;
                return;
            }

            try {
                await oa.cmd('job', 'delete', { ':job': job.id });
                console.error(`ok - deleted job ${job.id} (${job._reason})`);
            } catch (err) {
                console.error(`not ok - db delete failed for job ${job.id}: ${err.message}`);
                stats.errors++;
            }
        });
}
