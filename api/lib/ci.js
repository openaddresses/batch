'use strict';

const Run = require('./run');
const request = require('request');
const Err = require('./error');
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

    add_job(source_url) {
        this.jobs.push(source_url);
    }

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

            CI.fileprep(files, gh.sha).forEach((file) => {
                console.error(`ok - GH:Push:${sha}: Job: ${file}`);
                gh.add_job(file);
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
                + `### ${job.source_name}-${job.layer}-${job.name}\n`
                + `![Preview Image](https://batch.openaddresses.io/api/job/${job.id}/output/source.png)\n`;
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
     * Accept git repo relative file paths and convert them into github.com paths
     *
     * @param {string[]} files List of files to prep
     * @param {string} sha GitSha of files to prep
     *
     * @returns {string[]} Deduped list of github.com file paths
     */
    static fileprep(files, sha) {
        return Array.from(new Set(files.filter((file) => {
            if (!/sources\//.test(file) || !/\.json$/.test(file)) return false;
            return true;
        }).map((file) => {
            file = `https://raw.githubusercontent.com/openaddresses/openaddresses/${sha}/${file}`;
            return file;
        }))).sort();
    }

    async filediff(ref) {
        return new Promise((resolve, reject) => {
            request({
                url: `https://api.github.com/repos/openaddresses/openaddresses/compare/master...${ref}`,
                json: true,
                headers: {
                    'User-Agent': `OpenAddresses v${pkg.version}`
                },
                method: 'GET'
            }, (err, res) => {
                if (err) return reject(err);

                return resolve(res.body.files.map((file) => {
                    return file.filename;
                }));
            });
        });
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
            event.after, // GitSha
            event.ref,
            event.head_commit
        );

        return true;
    }

    /**
     * Respond to issue events
     *
     * @param {Pool} pool - Postgres Pool instance
     * @param {Object} event - GitHub Event Object
     */
    async issue(pool, event) {
        console.error('ISSUE', JSON.stringify(event));
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

        if (['opened', 'synchronize'].includes(event.action) && event.pull_request.head.repo.fork) {
            await this.create_check(
                event.pull_request.head.sha,
                event.pull_request.head.label,
                {
                    url: `https://github.com/openaddresses/openaddresses/pull/${event.number}/commits/${event.pull_request.head.sha}`
                }
            );
        }

        return true;
    }

    /**
     * Respond to issue comment request events
     *
     * @param {Pool} pool - Postgres Pool instance
     * @param {Object} event - GitHub Event Object
     */
    async comment(pool, event) {
        console.error('COMMENT', JSON.stringify(event));
        return true;
    }
}

module.exports = CI;
