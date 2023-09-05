import Err from '@openaddresses/batch-error';
import Run from '../lib/types/run.js';
import Job from '../lib/types/job.js';
import Auth from '../lib/auth.js';
import CI from '../lib/ci.js';
import S3 from '../lib/s3.js';

export default async function router(schema, config) {
    const ci = new CI(config);

    await schema.get('/job', {
        name: 'List Jobs',
        group: 'Job',
        auth: 'public',
        description: 'Return information about a given subset of jobs',
        query: 'req.query.ListJobs.json',
        res: 'res.ListJobs.json'
    }, async (req, res) => {
        try {
            if (req.query.status) req.query.status = req.query.status.split(',');

            const list = await Job.list(config.pool, req.query);

            if (!req.auth || !req.auth.level || req.auth.level !== 'sponsor') {
                for (const j of list.jobs) {
                    delete j.s3;
                    delete j.s3_validated;
                }
            }

            return res.json(list);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/job/:job', {
        name: 'Get Job',
        group: 'Job',
        auth: 'public',
        description: 'Return all information about a given job',
        ':job': 'integer',
        res: 'res.Job.json'
    }, async (req, res) => {
        try {
            const job = await Job.from(config.pool, req.params.job);

            if (!req.auth || !req.auth.level || req.auth.level !== 'sponsor') {
                delete job.s3;
                delete job.s3_validated;
            }

            return res.json(job.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/job/:job/raw', {
        name: 'Raw Source',
        group: 'Job',
        auth: 'public',
        description: 'Return the raw source from github - this API is not stable nor will it always return a consistent result',
        ':job': 'integer'
    }, async (req, res) => {
        try {
            const job = await Job.from(config.pool, req.params.job);

            return res.json(await job.get_raw());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.post('/job/:job/rerun', {
        name: 'Rerun Job',
        group: 'Job',
        auth: 'admin',
        description: 'Submit a job for reprocessing - often useful for network errors',
        ':job': 'integer',
        res: 'res.SingleJobsCreate.json'
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            const job = await Job.from(config.pool, req.params.job);
            const run = await Run.from(config.pool, job.run);

            const new_run = await Run.generate(config.pool, {
                live: !!run.live
            });

            return res.json(await Run.populate(config.pool, new_run.id, [{
                source: job.source,
                layer: job.layer,
                name: job.name
            }]));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/job/:job/delta', {
        name: 'Job Stats Comparison',
        group: 'Job',
        auth: 'public',
        description: 'Compare the stats of the given job against the current live data job',
        ':job': 'integer',
        res: 'res.SingleDelta.json'
    }, async (req, res) => {
        try {
            const delta = await Job.delta(config.pool, req.params.job);

            return res.json(delta);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/job/:job/output/source.png', {
        name: 'Get Job Preview',
        group: 'Job',
        auth: 'public',
        description: 'Return a preview image for the job',
        ':job': 'integer'
    }, async (req, res) => {
        try {
            console.error(`s3://${process.env.Bucket}/${process.env.StackName}/job/${req.params.job}/source.png`);
            const s3 = new S3({
                Bucket: process.env.Bucket,
                Key: `${process.env.StackName}/job/${req.params.job}/source.png`
            });

            return s3.stream(res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/job/:job/output/validated.geojson.gz', {
        name: 'Validated Data',
        group: 'Job',
        auth: 'user',
        description: `
            Sponsors of our project recieve access to validated data as a way of saying thanks for
            keeping our project alive.

            Note: the user must be authenticated to perform a download. One of our largest costs is
            S3 egress, authenticated downloads allow us to prevent abuse and keep the project running and the data freetw

            Faster Downloads? Have AWS? The Jobs, Data, & Collections API all return an "s3" property which links
            to a requester pays object on S3. For those that are able, this is the best way to download data.

            OpenAddresses is entirely funded by volunteers (many of then the developers themselves!)
            Please consider donating if you are able https://opencollective.com/openaddresses
        `,
        ':job': 'integer'
    }, async (req, res) => {
        try {
            await Auth.is_level(req, 'sponsor');

            const job = await Job.from(config.pool, req.params.job);

            if (!job.output.validated) throw new Err(400, null, 'Job does not have validated data');

            return res.redirect(`https://v2.openaddresses.io/${process.env.StackName}/job/${req.params.job}/validated.geojson.gz`);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/job/:job/output/source.geojson.gz', {
        name: 'Get Job Data',
        group: 'Job',
        auth: 'user',
        description: `
            Note: the user must be authenticated to perform a download. One of our largest costs is
            S3 egress, authenticated downloads allow us to prevent abuse and keep the project running and the data freetw

            Faster Downloads? Have AWS? The Jobs, Data, & Collections API all return an "s3" property which links
            to a requester pays object on S3. For those that are able, this is the best way to download data.

            OpenAddresses is entirely funded by volunteers (many of then the developers themselves!)
            Please consider donating if you are able https://opencollective.com/openaddresses
        `,
        ':job': 'integer'
    }, async (req, res) => {
        try {
            await Auth.is_auth(req, true);

            const job = await Job.from(config.pool, req.params.job);

            if (!job.output.output) throw new Err(400, null, 'Job does not have output data');

            return res.redirect(`https://v2.openaddresses.io/${process.env.StackName}/job/${req.params.job}/source.geojson.gz`);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/job/:job/output/sample', {
        name: 'Small Sample',
        group: 'Job',
        auth: 'public',
        description: 'Return an Array containing a sample of the properties',
        ':job': 'integer'
    }, async (req, res) => {
        try {
            const s3 = new S3({
                Bucket: process.env.Bucket,
                Key: `${process.env.StackName}/job/${req.params.job}/source.geojson.gz`
            });

            res.json(await s3.sample());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/job/:job/output/cache.zip', {
        name: 'Get Job Cache',
        group: 'Job',
        auth: 'user',
        description: `
            Note: the user must be authenticated to perform a download. One of our largest costs is
            S3 egress, authenticated downloads allow us to prevent abuse and keep the project running and the data freetw

            Faster Downloads? Have AWS? The Jobs, Data, & Collections API all return an "s3" property which links
            to a requester pays object on S3. For those that are able, this is the best way to download data.

            OpenAddresses is entirely funded by volunteers (many of then the developers themselves!)
            Please consider donating if you are able https://opencollective.com/openaddresses
        `,
        ':job': 'integer'
    }, async (req, res) => {
        try {
            await Auth.is_auth(req, true);

            return res.redirect(`https://v2.openaddresses.io/${process.env.StackName}/job/${req.params.job}/cache.zip`);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/job/:job/log', {
        name: 'Get Job Log',
        group: 'Job',
        auth: 'public',
        description: `
            Return the batch-machine processing log for a given job
            Note: These are stored in AWS CloudWatch and *do* expire
            The presence of a loglink on a job, does not guarentree log retention
        `,
        ':job': 'integer',
        query: 'req.query.SingleLog.json',
        res: 'res.SingleLog.json'
    }, async (req, res) => {
        try {
            const job = await Job.from(config.pool, req.params.job);

            const log = await job.log(req.query.format);

            if (!req.query.dl) {
                if (!req.query.format || req.query.format === 'json') {
                    return res.json(log);
                } else {
                    return res.send(log);
                }
            } else {
                res.attachment(`log-${req.params.job}.${req.query.format || 'json'}`);
                res.send(log);
            }
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.patch('/job/:job', {
        name: 'Update Job',
        group: 'Job',
        auth: 'admin',
        description: 'Update a job',
        ':job': 'integer',
        body: 'req.body.PatchJob.json',
        res: 'res.Job.json'
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            const job = await Job.commit(config.pool, req.params.job, req.body);
            await Run.ping(config.pool, ci, job);
            await config.cacher.del('data');

            return res.json(job.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

}
