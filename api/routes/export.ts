import Err from '@openaddresses/batch-error';
import Auth from '../lib/auth.js';
import { Type } from '@sinclair/typebox';
import Schema from '@openaddresses/batch-schema';
import type Config from '../lib/config.js';
import type { ExportResponseType } from '../lib/types.js';
import {
    CreateExportBody,
    ExportResponse,
    SingleLogResponse,
    ListExportQuery,
    ListExportResponse,
    StandardResponse,
    PatchExportBody,
} from '../lib/types.js';

export default async function router(schema: Schema, config: Config) {
    await schema.post('/export', {
        name: 'Create Export',
        group: 'Exports',
        description: 'Create a new export task',
        body: CreateExportBody,
        res: ExportResponse,
    }, async (req, res) => {
        try {
            const auth = await Auth.is_level(req, 'backer');

            if (auth.access !== 'admin' && await config.models.Exporter.monthly(Number(auth.uid)) >= config.limits.exports) {
                throw new Err(400, null, 'Reached Monthly Export Limit');
            }

            const job = await config.models.Job.from(req.body.job_id);
            if (job.status !== 'Success') throw new Err(400, null, 'Cannot export a job that was not successful');

            const exp = await config.models.Exporter.generate({ ...req.body, uid: Number(auth.uid) });
            await config.models.Exporter.batch(exp);
            return res.json(exp as unknown as ExportResponseType);
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
            exportid: Type.Integer(),
        }),
        res: SingleLogResponse,
    }, async (req, res) => {
        try {
            const auth = await Auth.is_auth(req);
            const exp = await config.models.Exporter.from(req.params.exportid);
            if (auth.access !== 'admin' && auth.uid !== exp.uid) throw new Err(403, null, 'You didn\'t create that export');

            return res.json(await config.models.Exporter.log(exp));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/export', {
        name: 'List Export',
        group: 'Exports',
        description: 'List existing exports',
        query: ListExportQuery,
        res: ListExportResponse,
    }, async (req, res) => {
        try {
            const auth = await Auth.is_auth(req);
            if (auth.access !== 'admin') {
                req.query.uid = String(auth.uid);
            }

            const list = await config.models.Exporter.list(req.query);

            res.json({
                total: list.total,
                exports: list.items,
            } as unknown as import('../lib/types.js').ListExportResponseType);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/export/:exportid', {
        name: 'Get Export',
        group: 'Exports',
        description: 'Get a single export',
        params: Type.Object({
            exportid: Type.Integer(),
        }),
        res: ExportResponse,
    }, async (req, res) => {
        try {
            const auth = await Auth.is_auth(req);
            const exp = await config.models.Exporter.from(req.params.exportid);
            if (auth.access !== 'admin' && auth.uid !== exp.uid) throw new Err(403, null, 'You didn\'t create that export');

            res.json(exp as unknown as ExportResponseType);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.put('/export/:exportid', {
        name: 'Re-run Export',
        group: 'Exports',
        description: 'Re-run an export',
        params: Type.Object({
            exportid: Type.Integer(),
        }),
        res: StandardResponse,
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            const exp = await config.models.Exporter.commit(req.params.exportid, {
                status: 'Pending',
                loglink: null,
                size: null,
            });

            await config.models.Exporter.batch(exp);

            res.json(exp as unknown as import('../lib/types.js').StandardResponseType);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/export/:exportid/output/export.zip', {
        name: 'Get Export Data',
        group: 'Exports',
        description: 'Download the data created during an export',
        params: Type.Object({
            exportid: Type.Integer(),
        }),
    }, async (req, res) => {
        try {
            const auth = await Auth.is_auth(req, true);

            await config.models.Exporter.data(auth, req.params.exportid, res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.patch('/export/:exportid', {
        name: 'Patch Export',
        group: 'Exports',
        description: 'Update an export',
        params: Type.Object({
            exportid: Type.Integer(),
        }),
        body: PatchExportBody,
        res: ExportResponse,
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            const exp = await config.models.Exporter.commit(req.params.exportid, req.body);

            return res.json(exp as unknown as ExportResponseType);
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
