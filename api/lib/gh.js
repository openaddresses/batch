'use strict';
/**
 * @class
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

module.exports = GH;
