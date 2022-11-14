import Err from '@openaddresses/batch-error';
import Job from '../lib/types/job.js';
import Exporter from '../lib/types/exporter.js';
import Auth from '../lib/auth.js';

export default async function router(schema, config) {
    await schema.post('/export', {
        name: 'Create Export',
        group: 'Exports',
        auth: 'user',
        description: 'Create a new export task',
        body: 'req.body.CreateExport.json',
        res: 'res.Export.json'
    }, async (req, res) => {
        try {
            await Auth.is_level(req, 'backer');

            if (req.auth.access !== 'admin' && await Exporter.count(config.pool, req.auth.uid) >= config.limits.exports) {
                throw new Err(400, null, 'Reached Monthly Export Limit');
            }

            const job = await Job.from(config.pool, req.body.job_id);
            if (job.status !== 'Success') throw new Err(400, null, 'Cannot export a job that was not successful');

            req.body.uid = req.auth.uid;

            const exp = await Exporter.generate(config.pool, req.body);
            await exp.batch();
            return res.json(exp.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/export/:exportid/log', {
        name: 'Get Export Log',
        group: 'Exports',
        auth: 'user',
        description: `
            Return the batch-machine processing log for a given export
            Note: These are stored in AWS CloudWatch and *do* expire
            The presence of a loglink on a export does not guarantee log retention
        `,
        ':exportid': 'integer',
        res: 'res.SingleLog.json'
    }, async (req, res) => {
        try {
            const exp = await Exporter.from(config.pool, req.params.exportid);
            if (req.auth.access !== 'admin' && req.auth.uid !== exp.uid) throw new Err(403, null, 'You didn\'t create that export');

            return res.json(await exp.log());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/export', {
        name: 'List Export',
        group: 'Exports',
        auth: 'user',
        description: 'List existing exports',
        query: 'req.query.ListExport.json',
        res: 'res.ListExport.json'
    }, async (req, res) => {
        try {
            if (req.auth.access !== 'admin') {
                req.query.uid = req.auth.uid;
            }

            res.json(await Exporter.list(config.pool, req.query));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/export/:exportid', {
        name: 'Get Export',
        group: 'Exports',
        auth: 'user',
        description: 'Get a single export',
        ':exportid': 'integer',
        res: 'res.Export.json'
    }, async (req, res) => {
        try {
            const exp = (await Exporter.from(config.pool, req.params.exportid)).serialize();
            if (req.auth.access !== 'admin' && req.auth.uid !== exp.uid) throw new Err(403, null, 'You didn\'t create that export');

            res.json(exp);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.put('/export/:exportid', {
        name: 'Re-run Export',
        group: 'Exports',
        auth: 'admin',
        description: 'Re-run an export',
        ':exportid': 'integer',
        res: 'res.Standard.json'
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            const exp = await Exporter.commit(config.pool, req.params.exportid, {
                status: 'Pending',
                loglink: null,
                size: null
            });

            await exp.batch();

            res.json(exp);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/export/:exportid/output/export.zip', {
        name: 'Get Export Data',
        group: 'Exports',
        auth: 'user',
        description: 'Download the data created during an export',
        ':exportid': 'integer'
    }, async (req, res) => {
        try {
            await Auth.is_auth(req, true);

            await Exporter.data(config.pool, req.auth, req.params.exportid, res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.patch('/export/:exportid', {
        name: 'Patch Export',
        group: 'Exports',
        auth: 'admin',
        description: 'Update an export',
        ':exportid': 'integer',
        body: 'req.body.PatchExport.json',
        res: 'res.Export.json'
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            const exp = await Exporter.commit(config.pool, req.params.exportid, req.body);

            return res.json(exp.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
