import { fetch } from 'undici';
import assert from 'assert';
import fs from 'fs';
import Err from '@openaddresses/batch-error';
import GH from './gh.js';
import type { Octokit } from '@octokit/rest';
import type Config from './config.js';
import type { ExplodedJob } from './util.js';

const pkg: { version: string } = JSON.parse(String(fs.readFileSync(new URL('../package.json', import.meta.url))));

interface RunLike {
    id: number;
    status: string;
    github?: { check?: number; sha?: string; ref?: string; url?: string } | null;
}

interface FileDiff {
    filename: string;
    raw: string;
}

interface SourceDef {
    _layer?: string;
    name: string;
    license?: unknown;
    website?: string;
    [k: string]: unknown;
}

interface HeadCommit {
    url: string;
    added?: string[];
    modified?: string[];
}

interface PushEvent {
    after: string;
    ref: string;
    head_commit: HeadCommit;
}

interface PullEvent {
    action: string;
    number: number;
    pull_request: {
        merged_at?: string | null;
        head: {
            sha: string;
            label: string;
            repo: { fork: boolean };
        };
    };
}

/**
 * @class
 */
export default class CI {
    config: Config;

    constructor(config: Config) {
        this.config = config;
    }

    private get octo(): Octokit {
        if (!this.config.octo) throw new Err(500, null, 'GitHub is not configured');
        return this.config.octo;
    }

    /**
     * Once a run is finished, update the corresponding github check
     */
    async finish_check(run: RunLike): Promise<void> {
        if (!['Success', 'Fail'].includes(run.status)) {
            throw new Err(400, null, `Github check can only report Success/Fail, given: ${run.status}`);
        }

        try {
            const conclusion = run.status === 'Success' ? 'success' : 'failure';

            await this.octo.checks.update({
                owner: 'openaddresses',
                repo: 'openaddresses',
                check_run_id: Number(run.github?.check),
                conclusion: conclusion,
            });

            const issue = await this.format_issue(run);
            console.error('ISSUE: ', issue);
            if (!issue) return; // No Successful Jobs = No Issue Comment

            const prs = await this.get_prs(String(run.github?.sha));
            for (const pr of prs) {
                this.add_issue(pr, issue);
            }
        } catch (err) {
            throw err instanceof Error ? err : new Error(String(err));
        }
    }

    /**
     * Once a run is created, create a pending github check
     */
    async create_check(sha: string, ref: string, head_commit: HeadCommit): Promise<void> {
        try {
            const check = await this.octo.checks.create({
                owner: 'openaddresses',
                repo: 'openaddresses',
                name: 'openaddresses/data-pls',
                head_sha: sha,
            });

            const is_live = ref === 'refs/heads/master';

            const gh = new GH(
                head_commit.url,
                ref,
                sha,
                check.data.id,
            );

            console.error(`ok - GH:Push:${sha}: Added Check`);

            let files: FileDiff[] = [];
            if (ref === 'refs/heads/master') {
                files = ([] as string[]).concat(head_commit.added ?? [], head_commit.modified ?? []).map((filename) => {
                    return { filename, raw: '' };
                });
            } else {
                files = await this.filediff(ref.replace(/refs\/heads\//, ''));
            }

            (await CI.internaldiff(files)).forEach((job) => {
                console.error(`ok - GH:Push:${sha}: Job: ${job.source}-${job.layer}-${job.name}`);
                gh.add_job(job);
            });

            console.error(`ok - GH:Push:${sha}: ${gh.jobs.length} Jobs`);

            if (!gh.jobs.length) {
                await this.octo.checks.update({
                    owner: 'openaddresses',
                    repo: 'openaddresses',
                    check_run_id: gh.check,
                    conclusion: 'success',
                });
                console.error(`ok - GH:Push:${sha}: Closed Check - No Jobs`);
            } else {
                const run = await this.config.models.Run.generate({
                    live: is_live,
                    github: gh.json(),
                });
                console.error(`ok - GH:Push:${sha}: Run ${run.id} Created `);

                const jobs = await this.config.models.Run.populate(Number(run.id), gh.jobs);
                console.error(`ok - GH:Push:${sha}: Run Populated`);

                if (jobs.jobs.length === 0) {
                    await this.octo.checks.update({
                        owner: 'openaddresses',
                        repo: 'openaddresses',
                        check_run_id: gh.check,
                        conclusion: 'success',
                    });

                    console.error(`ok - GH:Push:${sha}: Check Closed - No Run Jobs Populated`);
                } else {
                    await this.octo.checks.update({
                        owner: 'openaddresses',
                        repo: 'openaddresses',
                        check_run_id: gh.check,
                        details_url: process.env.BaseUrl + `/run/${run.id}`,
                    });
                    console.error(`ok - GH:Push:${sha}: Check Updated`);
                }
            }
        } catch (err) {
            throw err instanceof Error ? err : new Error(String(err));
        }
    }

    /**
     * Create a markdown formatted issue showing successful preview.pngs for all jobs in a given run
     */
    async format_issue(run: RunLike): Promise<string> {
        const jobs = await this.config.models.Run.jobs(run.id);
        let issue = '';

        for (const job of jobs) {
            if (!['Warn', 'Success'].includes(String(job.status))) continue;

            const countStr = job.count
                ? ` | ${Number(job.count).toLocaleString('en-US')} features`
                : '';

            issue = issue + '\n'
                + `### [${job.source_name}-${job.layer}-${job.name}](https://batch.openaddresses.io/job/${job.id})\n`
                + `[View Map](https://batch.openaddresses.io/job/${job.id})${countStr}\n`;
        }

        return issue.trim();
    }

    /**
     * Add an issue showing a preview PNG to a given PR
     */
    async add_issue(pr: number, issue: string): Promise<void> {
        await this.octo.issues.createComment({
            owner: 'openaddresses',
            repo: 'openaddresses',
            issue_number: pr,
            body: issue,
        });
    }

    /**
     * Find out whether a particular GitSha is part of an open PR
     */
    async get_prs(gitsha: string): Promise<number[]> {
        try {
            const res = await this.octo.search.issuesAndPullRequests({
                q: `repo:openaddresses/openaddresses+${gitsha}`,
            });

            if (res.data.total_count === 0) return [];

            return res.data.items.map((ele) => {
                return ele.number;
            });
        } catch (err) {
            throw err instanceof Error ? err : new Error(String(err));
        }
    }

    /**
     * Calculate the individual filenames & patches that changed in a PR
     */
    async filediff(ref: string): Promise<FileDiff[]> {
        console.error(`ok - FileDiff: ${ref}`);

        const res = await fetch(`https://api.github.com/repos/openaddresses/openaddresses/compare/master...${ref}`, {
            headers: {
                'User-Agent': `OpenAddresses v${pkg.version}`,
            },
            method: 'GET',
        });
        const res_body = await res.json() as { files: Array<{ filename: string; raw_url: string }> };

        return res_body.files.map((file) => {
            return {
                filename: file.filename,
                raw: decodeURIComponent(file.raw_url),
            };
        });
    }

    /**
     * Given a list of filediffs, calculate what sources in the JSON file changed
     */
    static async internaldiff(files: FileDiff[]): Promise<ExplodedJob[]> {
        const jobs: ExplodedJob[] = [];

        for (const file of files) {
            // Only source definition files under sources/ should ever be turned into jobs.
            // Without this guard, any changed/added JSON file anywhere in the repo (eg.
            // scripts/**/*.json template or helper files) that happens to contain a
            // "layers" key gets treated as a real source and queued as a job.
            if (!file.filename.startsWith('sources/') || !file.filename.endsWith('.json')) {
                continue;
            }

            const branch_sources: Record<string, SourceDef> = {};
            const master_sources: Record<string, SourceDef> = {};

            try {
                const url = new URL(`https://raw.githubusercontent.com/openaddresses/openaddresses/master/${file.filename}`);

                const master_res = await fetch(url, {
                    headers: { 'User-Agent': `OpenAddresses v${pkg.version}` },
                    method: 'GET',
                });

                let master_json: { layers?: Record<string, SourceDef[]> } = {};
                try {
                    if (master_res.ok) {
                        master_json = await master_res.json() as { layers?: Record<string, SourceDef[]> };
                    } else {
                        throw new Err(500, null, await master_res.text());
                    }
                } catch (err) {
                    // This isn't always an error - if the source is new you can't compare against master as
                    // it won't exist - hence the fallback to an empty object
                    console.error(`Error: InternalDiff: ${url} HTTP:${master_res.status}: ${err instanceof Error ? err.message : String(err)}`);
                }

                if (master_json.layers) {
                    for (const layertype of Object.keys(master_json.layers)) {
                        for (const source of master_json.layers[layertype]) {
                            source._layer = layertype;
                            master_sources[`${layertype}-${source.name}`] = source;
                        }
                    }
                }

                const branch_res = await fetch(file.raw, {
                    headers: { 'User-Agent': `OpenAddresses v${pkg.version}` },
                    method: 'GET',
                });

                const branch_json = await branch_res.json() as { layers: Record<string, SourceDef[]> };

                for (const layertype of Object.keys(branch_json.layers)) {
                    for (const source of branch_json.layers[layertype]) {
                        source._layer = layertype;
                        branch_sources[`${layertype}-${source.name}`] = source;
                    }
                }
            } catch (err) {
                console.error(err);
                continue;
            }

            for (const branch of Object.keys(branch_sources)) {
                const bsource = branch_sources[branch];
                const license = (bsource.license && typeof bsource.license === 'object')
                    ? { ...(bsource.license as Record<string, unknown>), website: bsource.website }
                    : undefined;

                if (!master_sources[branch]) {
                    jobs.push({
                        source: file.raw,
                        layer: String(bsource._layer),
                        name: bsource.name,
                        license,
                    });

                    continue;
                }

                try {
                    assert.deepEqual(master_sources[branch], branch_sources[branch]);
                } catch (err) {
                    console.error(err);
                    jobs.push({
                        source: file.raw,
                        layer: String(bsource._layer),
                        name: bsource.name,
                        license,
                    });
                }
            }
        }

        return jobs;
    }

    /**
     * Respond to push events
     */
    async push(event: PushEvent): Promise<boolean> {
        // The push event was to merge/delete a given branch/pr
        if (event.after === '0000000000000000000000000000000000000000') {
            return true;
        }

        await this.create_check(
            event.after, // GitSha
            event.ref,
            event.head_commit,
        );

        return true;
    }

    /**
     * Respond to pull request events
     */
    async pull(event: PullEvent): Promise<boolean> {
        console.error('PULL', JSON.stringify(event));

        // Create a CheckSuite
        if (['opened', 'synchronize'].includes(event.action) && event.pull_request.head.repo.fork) {
            await this.create_check(
                event.pull_request.head.sha,
                event.pull_request.head.label,
                {
                    url: `https://github.com/openaddresses/openaddresses/pull/${event.number}/commits/${event.pull_request.head.sha}`,
                },
            );

        // Mark the Run as Live since the PR was merged into master
        } else if (event.action === 'closed' && event.pull_request.merged_at) {
            const sha = event.pull_request.head.sha;

            const run = await this.config.models.Run.from_sha(sha);

            await this.config.models.Run.commit(run.id, {
                live: true,
            });

            const jobs = await this.config.models.Run.jobs(run.id);

            for (const job of jobs) {
                await this.config.models.Run.ping(this, job);
            }
        }

        return true;
    }
}
