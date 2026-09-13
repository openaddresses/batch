import Err from '@openaddresses/batch-error';
import Job from '../lib/models/Job.js';
import Auth from '../lib/auth.js';
import CI from '../lib/ci.js';
import S3 from '../lib/s3.js';
import { Type } from '@sinclair/typebox';
import {
    ListJobsQuery,
    ListJobsResponse,
    ListOrphanedJobsQuery,
    JobResponse,
    SingleJobsCreateResponse,
    SingleDeltaResponse,
    SingleLogQuery,
    SingleLogResponse,
    PatchJobBody,
    StandardResponse
} from '../lib/types.js';

export default async function router(schema, config) {
    const ci = new CI(config);

    await schema.get('/job', {
        name: 'List Jobs',
        group: 'Job',
        description: 'Return information about a given subset of jobs',
        query: ListJobsQuery,
        res: ListJobsResponse
    }, async (req, res) => {
        try {
            if (req.query.status) req.query.status = req.query.status.split(',');

            const list = await config.models.Job.list(req.query);

            if (!req.auth || !req.auth.level || req.auth.level !== 'sponsor') {
                for (const j of list.items) {
                    delete j.s3;
                    delete j.s3_validated;
                }
            }

            return res.json({
                total: list.total,
                jobs: list.items
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/job/orphaned', {
        name: 'List Orphaned Jobs',
        group: 'Job',
        description: 'Return jobs that have no matching entry in the results table',
        query: ListOrphanedJobsQuery,
        res: ListJobsResponse
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            const list = await config.models.Job.orphaned(req.query);

            return res.json({
                total: list.total,
                jobs: list.items
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/job/:job', {
        name: 'Get Job',
        group: 'Job',
        description: 'Return all information about a given job',
        params: Type.Object({
            job: Type.Integer()
        }),
        res: JobResponse
    }, async (req, res) => {
        try {
            const job = await config.models.Job.from(req.params.job);

            if (!req.auth || !req.auth.level || req.auth.level !== 'sponsor') {
                delete job.s3;
                delete job.s3_validated;
            }

            return res.json(job);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/job/:job/raw', {
        name: 'Raw Source',
        group: 'Job',
        description: 'Return the raw source from github - this API is not stable nor will it always return a consistent result',
        params: Type.Object({
            job: Type.Integer()
        })
    }, async (req, res) => {
        try {
            const job = await config.models.Job.from(req.params.job);

            return res.json(await Job.raw(job));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.post('/job/:job/rerun', {
        name: 'Rerun Job',
        group: 'Job',
        description: 'Submit a job for reprocessing - often useful for network errors',
        params: Type.Object({
            job: Type.Integer()
        }),
        res: SingleJobsCreateResponse
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            const job = await config.models.Job.from(req.params.job);
            const run = await config.models.Run.from(job.run);

            const new_run = await config.models.Run.generate({
                live: !!run.live
            });

            return res.json(await config.models.Run.populate(new_run.id, [{
                source: job.source,
                layer: job.layer,
                name: job.name,
                license: job.license
            }]));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/job/:job/delta', {
        name: 'Job Stats Comparison',
        group: 'Job',
        description: 'Compare the stats of the given job against the current live data job',
        params: Type.Object({
            job: Type.Integer()
        }),
        res: SingleDeltaResponse
    }, async (req, res) => {
        try {
            const delta = await config.models.Job.delta(req.params.job);

            return res.json(delta);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/job/:job/output/source.png', {
        name: 'Get Job Preview',
        group: 'Job',
        description: 'Return a preview image for the job',
        params: Type.Object({
            job: Type.Integer()
        })
    }, async (req, res) => {
        try {
            console.error(`s3://${process.env.Bucket}/${process.env.StackName}/job/${req.params.job}/source.png`);
            const s3 = new S3({
                Bucket: process.env.Bucket,
                Key: `${process.env.StackName}/job/${req.params.job}/source.png`
            });

            return await s3.stream(res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/job/:job/output/validated.geojson.gz', {
        name: 'Validated Data',
        group: 'Job',
        description: `
            Sponsors of our project receive access to validated data as a way of saying thanks for
            keeping our project alive.

            Note: the user must be authenticated to perform a download. One of our largest costs is
            S3 egress, authenticated downloads allow us to prevent abuse, keep the project running, and the data free.

            Faster Downloads? Have AWS? The Jobs, Data, & Collections API all return an "s3" property which links
            to a requester pays object on S3. For those that are able, this is the best way to download data.

            OpenAddresses is entirely funded by volunteers (many of then the developers themselves!)
            Please consider donating if you are able https://opencollective.com/openaddresses
        `,
        params: Type.Object({
            job: Type.Integer()
        })
    }, async (req, res) => {
        try {
            await Auth.is_level(req, 'sponsor');

            const job = await config.models.Job.from(req.params.job);

            if (!job.output.validated) throw new Err(400, null, 'Job does not have validated data');

            return res.redirect(`https://v2.openaddresses.io/${process.env.StackName}/job/${req.params.job}/validated.geojson.gz`);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/job/:job/output/source.geojson.gz', {
        name: 'Get Job Data',
        group: 'Job',
        description: `
            Note: the user must be authenticated to perform a download. One of our largest costs is
            S3 egress, authenticated downloads allow us to prevent abuse and keep the project running and the data free.

            Faster Downloads? Have AWS? The Jobs, Data, & Collections API all return an "s3" property which links
            to a requester pays object on S3. For those that are able, this is the best way to download data.

            OpenAddresses is entirely funded by volunteers (many of then the developers themselves!)
            Please consider donating if you are able https://opencollective.com/openaddresses
        `,
        params: Type.Object({
            job: Type.Integer()
        })
    }, async (req, res) => {
        try {
            await Auth.is_auth(req, true);

            const job = await config.models.Job.from(req.params.job);

            if (!job.output.output) throw new Err(400, null, 'Job does not have output data');

            return res.redirect(`https://v2.openaddresses.io/${process.env.StackName}/job/${req.params.job}/source.geojson.gz`);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/job/:job/output/sample', {
        name: 'Small Sample',
        group: 'Job',
        description: 'Return an Array containing a sample of the properties',
        params: Type.Object({
            job: Type.Integer()
        })
    }, async (req, res) => {
        try {
            const s3 = new S3({
                Bucket: process.env.Bucket,
                Key: `${process.env.StackName}/job/${req.params.job}/source.geojson.gz`
            });

            const sample = await s3.sample();

            // Job output objects are never overwritten once written, so it's safe to cache
            // the success response indefinitely.
            res.set('Cache-Control', 'public, max-age=31536000, immutable');
            res.json(sample);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/job/:job/output/cache.zip', {
        name: 'Get Job Cache',
        group: 'Job',
        description: `
            Note: the user must be authenticated to perform a download. One of our largest costs is
            S3 egress, authenticated downloads allow us to prevent abuse and keep the project running and the data free.

            Faster Downloads? Have AWS? The Jobs, Data, & Collections API all return an "s3" property which links
            to a requester pays object on S3. For those that are able, this is the best way to download data.

            OpenAddresses is entirely funded by volunteers (many of then the developers themselves!)
            Please consider donating if you are able https://opencollective.com/openaddresses
        `,
        params: Type.Object({
            job: Type.Integer()
        })
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
        description: `
            Return the batch-machine processing log for a given job
            Note: These are stored in AWS CloudWatch and *do* expire
            The presence of a loglink on a job, does not guarantee log retention
        `,
        params: Type.Object({
            job: Type.Integer()
        }),
        query: SingleLogQuery,
        res: SingleLogResponse
    }, async (req, res) => {
        try {
            const job = await config.models.Job.from(req.params.job);

            const log = await config.models.Job.log(job, req.query.format);

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
        description: 'Update a job',
        params: Type.Object({
            job: Type.Integer()
        }),
        body: PatchJobBody,
        res: JobResponse
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            const job = await config.models.Job.commit(req.params.job, req.body);
            await config.models.Run.ping(ci, job);
            await config.cacher.del('data');
            await config.cacher.del('licenses');

            return res.json(job);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.delete('/job/:job', {
        name: 'Delete Job',
        group: 'Job',
        description: 'Delete a job and its associated database record',
        params: Type.Object({
            job: Type.Integer()
        }),
        res: StandardResponse
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            await config.models.Job.delete(req.params.job);
            await config.cacher.del('data');
            await config.cacher.del('licenses');

            return res.json({
                status: 200,
                message: 'Job Deleted'
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });

}
