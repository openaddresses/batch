import Err from '@openaddresses/batch-error';
import Run from '../lib/types/run.js';
import Auth from '../lib/auth.js';
import { Type } from '@sinclair/typebox';
import {
    ListRunsQuery,
    ListRunsResponse,
    CreateRunBody,
    RunResponse,
    RunStatsResponse,
    PatchRunBody,
    SingleJobsCreateBody,
    SingleJobsCreateResponse,
    SingleJobsResponse,
    StandardResponse
} from '../lib/schema.js';

export default async function router(schema, config) {
    await schema.get('/run', {
        name: 'List Runs',
        group: 'Run',
        description: 'Runs are container objects that contain jobs that were started at the same time or by the same process',
        query: ListRunsQuery,
        res: ListRunsResponse
    }, async (req, res) => {
        try {
            if (req.query.status) req.query.status = req.query.status.split(',');
            const list = await Run.list(config.pool, req.query);

            return res.json(list);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.post('/run', {
        name: 'Create Runs',
        group: 'Run',
        description: 'Create a new run to hold a batch of jobs',
        body: CreateRunBody,
        res: RunResponse
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            const run = await Run.generate(config.pool, req.body);

            return res.json(run.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/run/:run', {
        name: 'Get Runs',
        group: 'Run',
        description: 'Get a single run',
        params: Type.Object({
            run: Type.Integer()
        }),
        res: RunResponse
    }, async (req, res) => {
        try {
            const run = await Run.from(config.pool, req.params.run);
            return res.json(run.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/run/:run/count', {
        name: 'Run Stats',
        group: 'Run',
        description: 'Return statistics about jobs within a given run',
        params: Type.Object({
            run: Type.Integer()
        }),
        res: RunStatsResponse
    }, async (req, res) => {
        try {
            res.json(await Run.stats(config.pool, req.params.run));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.patch('/run/:run', {
        name: 'Update Run',
        group: 'Run',
        description: 'Update a run',
        params: Type.Object({
            run: Type.Integer()
        }),
        body: PatchRunBody,
        res: RunResponse
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            const run = await Run.from(config.pool, req.params.run);

            // The CI is making a CI run "live" and updating the /data list
            if ((!run.live && req.body.live) || (run.live && !req.body.live)) await config.cacher.del('data');

            await run.commit(req.body);

            return res.json(run.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.post('/run/:run/jobs', {
        name: 'Populate Run Jobs',
        group: 'Run',
        description: `
            Given an array sources, explode it into multiple jobs and submit to batch
            or pass in a predefined list of sources/layer/names

            Note: once jobs are attached to a run, the run is "closed" and subsequent
            jobs cannot be attached to it
        `,
        params: Type.Object({
            run: Type.Integer()
        }),
        body: SingleJobsCreateBody,
        res: SingleJobsCreateResponse
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            return res.json(await Run.populate(config.pool, req.params.run, req.body.jobs));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/run/:run/jobs', {
        name: 'List Run Jobs',
        group: 'Run',
        description: 'return all jobs for a given run',
        params: Type.Object({
            run: Type.Integer()
        }),
        res: SingleJobsResponse
    }, async (req, res) => {
        try {
            const jobs = await Run.jobs(config.pool, req.params.run);

            res.json({
                run: req.params.run,
                jobs: jobs
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.delete('/run/:run', {
        name: 'Delete Run',
        group: 'Run',
        description: 'Delete a run. The run must have no remaining jobs.',
        params: Type.Object({
            run: Type.Integer()
        }),
        res: StandardResponse
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            const jobs = await Run.jobs(config.pool, req.params.run);
            if (jobs.length > 0) {
                throw new Err(400, null, 'Run still has jobs — delete them first');
            }

            await Run.delete(config.pool, req.params.run);

            return res.json({
                status: 200,
                message: 'Run Deleted'
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });

}
