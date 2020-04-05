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
        if (!['Sucess', 'Fail'].includes(run.status)) {
            throw new Err(400, null, 'Github check can only report Success/Fail');
        }

        try {
            const conclusion = run.status === 'Success' ? 'success' : 'failure';

            await this.config.octo.checks.update({
                owner: 'openaddresses',
                repo: 'openaddresses',
                check_run_id: run.github.check,
                conclusion: conclusion
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
        try {
            const check = await this.config.octo.checks.create({
                owner: 'openaddresses',
                repo: 'openaddresses',
                name: 'openaddresses/data-pls',
                head_sha: event.after
            });
            console.error(JSON.stringify(check));

            const gh = new GH(
                event.head_commit.url,
                event.ref,
                event.after,
                check.id
            );
            console.error('github', gh);

            console.error(`ok - GH:Push:${event.after}: Added Check`);

            let files = [];
            if (event.ref === 'refs/heads/master') {
                files = [].concat(event.head_commit.added, event.head_commit.modified);
            } else {
                files = await this.filediff(event.ref.replace(/refs\/heads\//, ''));
            }

            CI.fileprep(files, gh.sha).forEach((file) => {
                console.error(`ok - GH GH:Push:${event.after}: Job: ${file}`);
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
                    live: false, // TODO if ref is master - live should be true
                    github: gh.json()
                });
                console.error(`ok - GH:Push:${event.after}: Run ${run.id} Created `);

                await Run.populate(pool, run.id, gh.jobs);
                console.error(`ok - GH:Push:${event.after}: Run Populated`);

                await this.config.octo.checks.update({
                    owner: 'openaddresses',
                    repo: 'openaddresses',
                    check_run_id: gh.check,
                    details_url: process.env.BaseUrl + `/#runs:${run.id}`
                });
                console.error(`ok - GH:Push:${event.after}: Check Updated`);
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
