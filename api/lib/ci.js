const assert = require('assert');
const Run = require('./run');
const { promisify } = require('util');
const request = promisify(require('request'));
const { Err } = require('@openaddresses/batch-schema');
const pkg = require('../package.json');

/**
 * @class GH
 */
class GH {
    constructor(url, ref, sha, check) {
        this.url = url;
        this.ref = ref;
        this.sha = sha;
        this.check = check;

        this.jobs = [];
    }

    /**
     * Add a job to the GH Jobs queue
     *
     * @param {Object} job_object Job to add
     * @param {String} job_object.source
     * @param {String} job_object.layer
     * @param {String} job_object.name
     */
    add_job(job_object) {
        this.jobs.push(job_object);
    }

    /**
     * Return the JSON that will be stored in the run.json field of the db
     *
     * @returns {Object}
     */
    json() {
        return {
            url: this.url,
            ref: this.ref,
            sha: this.sha,
            check: this.check
        };
    }
}

/**
 * @class CI
 */
class CI {
    /**
     * @constructor
     *
     * @param {Config} config Server config
     */
    constructor(config) {
        this.config = config;
    }

    /**
     * Once a run is finished, update the corresponding github check
     *
     * @param {Pool} pool - Postgres Pool instance
     * @param {Run} run object to update GH status with
     */
    async finish_check(pool, run) {
        if (!['Success', 'Fail'].includes(run.status)) {
            throw new Err(400, null, `Github check can only report Success/Fail, given: ${run.status}`);
        }

        try {
            const conclusion = run.status === 'Success' ? 'success' : 'failure';

            await this.config.octo.checks.update({
                owner: 'openaddresses',
                repo: 'openaddresses',
                check_run_id: run.github.check,
                conclusion: conclusion
            });

            const issue = await this.format_issue(pool, run);
            console.error('ISSUE: ', issue);
            if (!issue) return; // No Successful Jobs = No Issue Comment

            const prs = await this.get_prs(run.github.sha);
            for (const pr of prs) {
                this.add_issue(pr, issue);
            }
        } catch (err) {
            throw new Error(err);
        }
    }

    /**
     * Once a run is created, create a pending github check
     *
     * @param {Pool} pool - Postgres Pool instance
     * @param {String} sha - GitSha to attach to
     * @param {String} ref - Git Ref
     * @param {Object} head_commit - Information about head commit
     */
    async create_check(pool, sha, ref, head_commit) {
        try {
            const check = await this.config.octo.checks.create({
                owner: 'openaddresses',
                repo: 'openaddresses',
                name: 'openaddresses/data-pls',
                head_sha: sha
            });

            const is_live = ref === 'refs/heads/master';

            const gh = new GH(
                head_commit.url,
                ref,
                sha,
                check.data.id
            );

            console.error(`ok - GH:Push:${sha}: Added Check`);

            let files = [];
            if (ref === 'refs/heads/master') {
                files = [].concat(head_commit.added, head_commit.modified);
            } else {
                files = await this.filediff(ref.replace(/refs\/heads\//, ''));
            }

            (await CI.internaldiff(files)).forEach((job) => {
                console.error(`ok - GH:Push:${sha}: Job: ${job.source}-${job.layer}-${job.name}`);
                gh.add_job(job);
            });

            console.error(`ok - GH:Push:${sha}: ${gh.jobs.length} Jobs`);

            if (!gh.jobs.length) {
                await this.config.octo.checks.update({
                    owner: 'openaddresses',
                    repo: 'openaddresses',
                    check_run_id: gh.check,
                    conclusion: 'success'
                });
                console.error(`ok - GH:Push:${sha}: Closed Check - No Jobs`);
            } else {
                const run = await Run.generate(pool, {
                    live: is_live,
                    github: gh.json()
                });
                console.error(`ok - GH:Push:${sha}: Run ${run.id} Created `);

                const jobs = await Run.populate(pool, run.id, gh.jobs);
                console.error(`ok - GH:Push:${sha}: Run Populated`);

                if (jobs.jobs.length === 0) {
                    await this.config.octo.checks.update({
                        owner: 'openaddresses',
                        repo: 'openaddresses',
                        check_run_id: gh.check,
                        conclusion: 'success'
                    });

                    console.error(`ok - GH:Push:${sha}: Check Closed - No Run Jobs Populated`);
                } else {
                    await this.config.octo.checks.update({
                        owner: 'openaddresses',
                        repo: 'openaddresses',
                        check_run_id: gh.check,
                        details_url: process.env.BaseUrl + `/run/${run.id}`
                    });
                    console.error(`ok - GH:Push:${sha}: Check Updated`);
                }
            }
        } catch (err) {
            throw new Error(err);
        }
    }

    /**
     * Create a markdown formatted issue showing successful preview.pngs for all jobs in a given run
     *
     * @param {Pool} pool - Postgres Pool instance
     * @param {Run} run object to update GH status with
     */
    async format_issue(pool, run) {
        const jobs = await Run.jobs(pool, run.id);
        let issue = '';

        for (const job of jobs) {
            if (!['Warn', 'Success'].includes(job.status)) continue;

            issue = issue + '\n'
                + `### [${job.source_name}-${job.layer}-${job.name}](https://batch.openaddresses.io/job/${job.id})\n`
                + `[![Preview Image](https://batch.openaddresses.io/api/job/${job.id}/output/source.png)](https://batch.openaddresses.io/job/${job.id})\n`;
        }

        return issue.trim();
    }


    /**
     * Add an issue showing a preview PNG to a given PR
     *
     * @param {Numeric} pr PR Number to add comment to
     * @param {String} issue Issue body
     */
    async add_issue(pr, issue) {
        await this.config.octo.issues.createComment({
            owner: 'openaddresses',
            repo: 'openaddresses',
            issue_number: pr,
            body: issue
        });
    }

    /**
     * Find out whether a particular GitSha is part of an open PR
     *
     * @param {String} gitsha The GitSha to check
     */
    async get_prs(gitsha) {
        try {
            const res = await this.config.octo.search.issuesAndPullRequests({
                q: `repo:openaddresses/openaddresses+${gitsha}`
            });

            if (res.data.total_count === 0) return [];

            return res.data.items.map((ele) => {
                return ele.number;
            });
        } catch (err) {
            throw new Error(err);
        }
    }

    /**
     * Calculate the individual filenames & patches that changed in a PR
     *
     * @param {String} ref Github Ref
     */
    async filediff(ref) {
        const res = await request({
            url: `https://api.github.com/repos/openaddresses/openaddresses/compare/master...${ref}`,
            json: true,
            headers: {
                'User-Agent': `OpenAddresses v${pkg.version}`
            },
            method: 'GET'
        });

        return res.body.files.map((file) => {
            return {
                file: file.filename,
                raw: file.raw_url
            };
        });
    }

    /**
     * Given a list of filediffs, calculate what sources in the JSON file changed
     * @param {Object[]} files
     */
    static async internaldiff(files) {
        const jobs = [];

        for (const file of files) {
            const branch_sources = {};
            const master_sources = {};

            try {
                const master_res = await request({
                    url: `https://raw.githubusercontent.com/openaddresses/openaddresses/master/${file.filename}`,
                    headers: { 'User-Agent': `OpenAddresses v${pkg.version}` },
                    method: 'GET'
                });

                let master_body = '{}';
                if (master_res.statusCode === 200) {
                    master_body = master_res.body;
                } else {
                    // This isn't always an error - if the source is new you can't compare against master as
                    // it won't exist - hence the fallback to an empty object
                    console.error(`Error: InternalDiff: HTTP:${master_res.statusCode}: ${master_res.body}`);
                }

                const master_json = JSON.parse(master_body);

                if (master_json.layers) {
                    for (const layertype of Object.keys(master_json.layers)) {
                        for (const source of master_json.layers[layertype]) {
                            source._layer = layertype;
                            master_sources[`${layertype}-${source.name}`] = source;
                        }
                    }
                }

                const branch_json = JSON.parse((await request({
                    url: file.raw,
                    headers: { 'User-Agent': `OpenAddresses v${pkg.version}` },
                    method: 'GET'
                })).body);

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
                if (!master_sources[branch]) {
                    jobs.push({
                        source: file.raw,
                        layer: branch_sources[branch]._layer,
                        name: branch_sources[branch].name
                    });

                    continue;
                }

                try {
                    assert.deepEqual(master_sources[branch], branch_sources[branch]);
                } catch (err) {
                    jobs.push({
                        source: file.raw,
                        layer: branch_sources[branch]._layer,
                        name: branch_sources[branch].name
                    });
                }
            }
        }

        return jobs;
    }

    /**
     * Respond to push events
     *
     * @param {Pool} pool - Postgres Pool instance
     * @param {Object} event - GitHub Event Object
     */
    async push(pool, event) {
        // The push event was to merge/delete a given branch/pr
        if (event.after === '0000000000000000000000000000000000000000') {
            return true;
        }

        await this.create_check(
            pool,
            event.after, // GitSha
            event.ref,
            event.head_commit
        );

        return true;
    }

    /**
     * Respond to pull request events
     *
     * @param {Pool} pool - Postgres Pool instance
     * @param {Object} event - GitHub Event Object
     */
    async pull(pool, event) {
        console.error('PULL', JSON.stringify(event));

        // Create a CheckSuite
        if (['opened', 'synchronize'].includes(event.action) && event.pull_request.head.repo.fork) {
            await this.create_check(
                pool,
                event.pull_request.head.sha,
                event.pull_request.head.label,
                {
                    url: `https://github.com/openaddresses/openaddresses/pull/${event.number}/commits/${event.pull_request.head.sha}`
                }
            );

        // Mark the Run as Live since the PR was merged into master
        } else if (event.action === 'closed' && event.pull_request.merged_at) {
            const sha = event.pull_request.head.sha;

            const run = await Run.from_sha(pool, sha);
            run.live = true;
            await run.commit(pool);
            const jobs = await Run.jobs(pool, run.id);

            for (const job of jobs) {
                await Run.ping(pool, this, job);
            }
        }

        return true;
    }
}

module.exports = CI;
