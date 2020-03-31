'use strict';

const Run = require('./run');

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

class CI {
    constructor(config) {
        this.config = config;
    }

    async push(pool, event) {
        try {
            const check = await this.config.okta.checks.create({
                owner: 'openaddresses',
                repo: 'openaddresses',
                name: 'openaddresses/data-pls',
                head_sha: event.after
            });

            const gh = new GH(
                event.head_commit.url,
                event.ref,
                event.after,
                check.id
            );

            console.error(`ok - GH:Push:${event.after}: Added Check`);

            const files = [].concat(event.head_commit.added, event.head_commit.modified);

            files.filter((file) => {
                if (
                    !/sources\//.test(file)
                    || !/\.json$\//.test(file)
                ) {
                    return true;
                }

                return false;
            }).forEach((file) => {
                file = `https://raw.githubusercontent.com/openaddresses/openaddresses/${gh.sha}/${file}`;

                gh.add_job(file);
            });
            console.error(`ok - GH:Push:${event.after}: ${gh.jobs.length} Jobs`);

            if (!gh.jobs.length) {
                await this.config.okta.checks.update({
                    owner: 'openaddresses',
                    repo: 'openaddresses',
                    check_run_id: gh.check,
                    conclusion: 'No data sources to run'
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
