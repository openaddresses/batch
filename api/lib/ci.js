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
     * Once a run is finished, update the corresponding check
     *
     * @param {Run} run object to update GH status with
     */
    async check(run) {
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

            const prs = await this.get_prs(run.github.sha);
            for (const pr of prs) {
                this.add_issue(pr);
            }
        } catch (err) {
            throw new Error(err);
        }
    }

    async add_issue(pr) {
        await this.config.octo.issues.createComment({
            owner: 'openaddresses',
            repo: 'openaddresses',
            issue_number: pr,
            body: 'All finished :)'
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

            if (res.total_count === 0) return [];

            console.error(res);
            return res.items.map((ele) => {
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

    async push(pool, event) {
        // The push event was to merge/delete a given branch/pr
        if (event.after === '0000000000000000000000000000000000000000') {
            return true;
        }

        try {
            const check = await this.config.octo.checks.create({
                owner: 'openaddresses',
                repo: 'openaddresses',
                name: 'openaddresses/data-pls',
                head_sha: event.after
            });

            const is_live = event.ref === 'refs/heads/master';

            const gh = new GH(
                event.head_commit.url,
                event.ref,
                event.after,
                check.data.id
            );

            console.error(`ok - GH:Push:${event.after}: Added Check`);

            let files = [];
            if (event.ref === 'refs/heads/master') {
                files = [].concat(event.head_commit.added, event.head_commit.modified);
            } else {
                files = await this.filediff(event.ref.replace(/refs\/heads\//, ''));
            }

            CI.fileprep(files, gh.sha).forEach((file) => {
                console.error(`ok - GH:Push:${event.after}: Job: ${file}`);
                gh.add_job(file);
            });

            console.error(`ok - GH:Push:${event.after}: ${gh.jobs.length} Jobs`);

            if (!gh.jobs.length) {
                await this.config.octo.checks.update({
                    owner: 'openaddresses',
                    repo: 'openaddresses',
                    check_run_id: gh.check,
                    conclusion: 'success'
                });
                console.error(`ok - GH:Push:${event.after}: Closed Check - No Jobs`);
            } else {
                const run = await Run.generate(pool, {
                    live: is_live,
                    github: gh.json()
                });
                console.error(`ok - GH:Push:${event.after}: Run ${run.id} Created `);

                const jobs = await Run.populate(pool, run.id, gh.jobs);
                console.error(`ok - GH:Push:${event.after}: Run Populated`);

                if (jobs.jobs.length === 0) {
                    await this.config.octo.checks.update({
                        owner: 'openaddresses',
                        repo: 'openaddresses',
                        check_run_id: gh.check,
                        conclusion: 'success'
                    });

                    console.error(`ok - GH:Push:${event.after}: Check Closed - No Run Jobs Populated`);
                } else {
                    await this.config.octo.checks.update({
                        owner: 'openaddresses',
                        repo: 'openaddresses',
                        check_run_id: gh.check,
                        details_url: process.env.BaseUrl + `/run/${run.id}`
                    });
                    console.error(`ok - GH:Push:${event.after}: Check Updated`);
                }
            }
        } catch (err) {
            throw new Error(err);
        }

        return true;
    }

    async issue(pool, event) {
        console.error('ISSUE', JSON.stringify(event));
        return true;
    }

    async pull(pool, event) {
        console.error('PULL', JSON.stringify(event));
        return true;
    }

    async comment(pool, event) {
        console.error('COMMENT', JSON.stringify(event));
        return true;
    }
}

module.exports = CI;
