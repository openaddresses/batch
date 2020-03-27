'use strict';

const Run = require('./run');
const Err = require('./error');
const diff = require('parse-diff');
const request = require('request');

class GH {
    constructor(pr, sha) {
        this.pr = pr;
        this.sha = sha;
    }
}

class CI {
    static pull(pool, event) {
        return new Promise((resolve, reject) => {
            console.error('PULL', JSON.stringify(event));

            if (event.action === 'opened') {
                const gh = new GH(event.number, event.head.sha);

                request({
                    url: event.pull_request.diff_url,
                    method: 'GET'
                }, async (err, res) => {
                    if (err) return reject(new Err(500, err, 'failed to fetch pull diff'));

                    const jobs = diff(res.body).map((file) => {
                        return file.to;
                    }).filter((file) => {
                        if (
                            !/sources\//.test(file)
                            || !/\.json$\//.test(file)
                        ) {
                            return false;
                        }

                        return true;
                    }).map((file) => {
                        return `https://raw.githubusercontent.com/openaddresses/openaddresses/${gh.sha}/${file}`;
                    });

                    console.error(JSON.stringify(jobs));

                    try {
                        await Run.generate(pool, {
                            live: false
                        });
                    } catch (err) {
                        return reject(err);
                    }

                    return resolve(true);
                });
            } else {
                return resolve(true);
            }
        });
    }

    static comment(pool, event) {
        return new Promise((resolve) => {
            console.error('COMMENT', JSON.stringify(event));

            return resolve(true);
        });
    }
}

module.exports = CI;
