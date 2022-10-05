import Err from '@openaddresses/batch-error';
import JobError from '../lib/types/joberror.js';
import Auth from '../lib/auth.js';
import CI from '../lib/ci.js';

export default async function router(schema, config) {
    const ci = new CI(config);

    await schema.get('/job/error', {
        name: 'Get Job Errors',
        group: 'JobErrors',
        auth: 'public',
        description: `
            All jobs that fail as part of a live run are entered into the JobError API
            This API powers a page that allows for human review of failing jobs
            Note: Job Errors are cleared with every subsequent full cache
        `,
        query: 'req.query.ErrorList.json',
        res: 'res.ErrorList.json'
    }, async (req, res) => {
        try {
            if (req.query.status) req.query.status = req.query.status.split(',');

            return res.json(await JobError.list(config.pool, req.query));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/job/error/count', {
        name: 'Job Error Count',
        group: 'JobErrors',
        auth: 'public',
        description: 'Return a simple count of the current number of job errors',
        res: 'res.ErrorCount.json'
    }, async (req, res) => {
        try {
            return res.json(await JobError.count(config.pool));
        } catch (err) {
            return Err.respond(err, res);
        }
    });


    await schema.get('/job/error/:job', {
        name: 'Get Job Error',
        group: 'JobErrors',
        auth: 'public',
        description: 'Return a single job error if one exists',
        ':job': 'integer',
        res: 'res.JobError.json'
    }, async (req, res) => {
        try {
            const joberror = await JobError.from(config.pool, req.params.job);
            return res.json(joberror.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.post('/job/error', {
        name: 'Create Job Error',
        group: 'JobErrors',
        auth: 'admin',
        description: 'Create a new Job Error in response to a live job that Failed or Warned',
        body: 'req.body.ErrorCreate.json',
        res: 'res.JobError.json'
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            const joberror = await JobError.generate(config.pool, req.body);

            return res.json(joberror.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.post('/job/error/:job', {
        name: 'Resolve Job Error',
        group: 'JobErrors',
        auth: 'admin',
        description: 'Mark a job error as resolved',
        ':job': 'integer',
        body: 'req.body.ErrorModerate.json',
        res: 'res.ErrorModerate.json'
    }, async (req, res) => {
        try {
            await Auth.is_flag(req, 'moderator');

            res.json(await JobError.moderate(config.pool, ci, req.params.job, req.body));
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
