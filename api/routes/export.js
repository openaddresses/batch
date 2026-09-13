import Err from '@openaddresses/batch-error';
import Job from '../lib/types/job.js';
import Exporter from '../lib/types/exporter.js';
import Auth from '../lib/auth.js';
import { Type } from '@sinclair/typebox';
import {
    CreateExportBody,
    ExportResponse,
    SingleLogResponse,
    ListExportQuery,
    ListExportResponse,
    StandardResponse,
    PatchExportBody
} from '../lib/schema.js';

export default async function router(schema, config) {
    await schema.post('/export', {
        name: 'Create Export',
        group: 'Exports',
        description: 'Create a new export task',
        body: CreateExportBody,
        res: ExportResponse
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
        description: `
            Return the batch-machine processing log for a given export
            Note: These are stored in AWS CloudWatch and *do* expire
            The presence of a loglink on a export does not guarantee log retention
        `,
        params: Type.Object({
            exportid: Type.Integer()
        }),
        res: SingleLogResponse
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
        description: 'List existing exports',
        query: ListExportQuery,
        res: ListExportResponse
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
        description: 'Get a single export',
        params: Type.Object({
            exportid: Type.Integer()
        }),
        res: ExportResponse
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
        description: 'Re-run an export',
        params: Type.Object({
            exportid: Type.Integer()
        }),
        res: StandardResponse
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
        description: 'Download the data created during an export',
        params: Type.Object({
            exportid: Type.Integer()
        })
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
        description: 'Update an export',
        params: Type.Object({
            exportid: Type.Integer()
        }),
        body: PatchExportBody,
        res: ExportResponse
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
