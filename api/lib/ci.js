'use strict';

const Run = require('./run');

class GH {
    constructor(url, ref, sha) {
        this.url = url;
        this.ref = ref;
        this.sha = sha;

        this.jobs = [];
    }

    add_job(source_url) {
        this.jobs.push(source_url);
    }

    json() {
        return {
            url: this.url,
            ref: this.ref,
            sha: this.sha
        };
    }
}

class CI {
    constructor(config) {
        this.config = config;
    }

    async push(pool, event) {
        try {
            const gh = new GH(
                event.head_commit.url,
                event.ref,
                event.after
            );

            await this.config.okta.checks.create({
                owner: 'openaddresses',
                repo: 'openaddresses',
                name: 'openaddresses/data-pls',
                head_sha: event.after
            });

            const files = [].concat(event.head_commit.added, event.head_commit.modified);

            const jobs = files.filter((file) => {
                if (
                    !/sources\//.test(file)
                    || !/\.json$\//.test(file)
                ) {
                    return false;
                }

                return true;
            }).forEach(gh.add_job);

            console.error(JSON.stringify(gh.jobs));

            const run = await Run.generate(pool, {
                live: false, // TODO if ref is master - live should be true
                github: gh.json()
            });

            await Run.populate(pool, run.id, jobs);
        } catch (err) {
            throw new Error(err);
        }

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
