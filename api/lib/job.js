const Err = require('./error');
const config = require('../package.json');
const AWS = require('aws-sdk');

const cwl = new AWS.CloudwatchLogs({ region: 'us-east-1' });
const lambda = new AWS.Lambda({ region: 'us-east-1' });

class Job {
    constructor(run, source, layer, name) {
        this.id = false,
        this.run = run;
        this.created = false;
        this.source = source;
        this.layer = layer;
        this.name = name;
        this.output = false;
        this.loglink = false;
        this.status = 'Pending';
        this.version = config.version;
    }

    json() {
        return {
            id: parseInt(this.id),
            run: parseInt(this.run),
            created: this.created,
            source: this.source,
            layer: this.layer,
            name: this.name,
            output: this.output,
            loglink: this.loglink,
            status: this.status,
            version: this.version
        };
    }

    static from(pool, id) {
        return new Promise((resolve, reject) => {
            pool.query(`
                SELECT
                    *
                FROM
                    job
                WHERE
                    id = $1
            `, [id], (err, pgres) => {
                if (err) return reject(new Err(500, err, 'failed to load job'));

                const job = new Job();

                for (const key of Object.keys(pgres.rows[0])) {
                    job[key] = pgres.rows[0][key];
                }

                return resolve(job);
            });
        });
    }

    loglink() {
        return new Promise((resolve, reject) => {
            if (!this.loglink) return reject(new Err(404, null, 'Job has not produced a log'));

            cwl.getLogEvents({
                logGroupName: '/aws/batch/job',
                logStreamName: this.loglink
            }, (err, res) => {
                if (err) return reject(new Err(500, err, 'Could not retrieve logs' ));

                return resolve(res.events.map((event) => {
                    return {
                        timestamp: event.timestamp,
                        message: event.message
                    };
                });
            });
        });
    }

    generate(pool) {
        return new Promise((resolve, reject) => {
            if (!this.run) return reject(new Err(400, null, 'Cannot generate a job without a run'));
            if (!this.source) return reject(new Err(400, null, 'Cannot generate a job without a source'));
            if (!this.layer) return reject(new Err(400, null, 'Cannot generate a job without a layer'));
            if (!this.name) return reject(new Err(400, null, 'Cannot generate a job without a name'));

            pool.query(`
                INSERT INTO job (
                    run,
                    created,
                    source,
                    layer,
                    name,
                    status,
                    version
                ) VALUES (
                    $1,
                    NOW(),
                    $2,
                    $3,
                    $4,
                    'Pending',
                    $5
                ) RETURNING *
            `, [
                this.run,
                this.source,
                this.layer,
                this.name,
                this.version
            ], (err, pgres) => {
                if (err) return reject(new Err(500, err, 'failed to generate job'));

                for (const key of Object.keys(pgres.rows[0])) {
                    this[key] = pgres.rows[0][key];
                }

                return resolve(this);
            });
        });
    }

    batch() {
        return new Promise((resolve, reject) => {
            if (!this.id) return reject(new Err(400, null, 'Cannot batch a job without an ID'));

            if (process.env.StackName === 'test') {
                return resolve(true);
            } else {
                lambda.invoke({
                    FunctionName: `${process.env.StackName}-invoke`,
                    InvocationType: 'Event',
                    LogType: 'Tail',
                    Payload: JSON.stringify({
                        job: this.id,
                        source: this.source,
                        layer: this.layer,
                        name: this.name
                    })
                }, (err, data) => {
                    if (err) return reject(new Err(500, err, 'failed to submit job to batch'));

                    return resolve(data);
                });
            }
        });
    }
}

module.exports = Job;
