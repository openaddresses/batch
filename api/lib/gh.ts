import type { ExplodedJob } from './util.js';

export interface GHJson {
    url: string;
    ref: string;
    sha: string;
    check: number;
}

/**
 * @class
 */
export default class GH {
    url: string;
    ref: string;
    sha: string;
    check: number;
    jobs: ExplodedJob[];

    constructor(url: string, ref: string, sha: string, check: number) {
        this.url = url;
        this.ref = ref;
        this.sha = sha;
        this.check = check;

        this.jobs = [];
    }

    /**
     * Add a job to the GH Jobs queue
     */
    add_job(job_object: ExplodedJob): void {
        this.jobs.push(job_object);
    }

    /**
     * Return the JSON that will be stored in the run.json field of the db
     */
    json(): GHJson {
        return {
            url: this.url,
            ref: this.ref,
            sha: this.sha,
            check: this.check,
        };
    }
}
