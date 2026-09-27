import Err from '@openaddresses/batch-error';
import Cacher from '../lib/cacher.js';
import Auth from '../lib/auth.js';
import { Type } from '@sinclair/typebox';
import Schema from '@openaddresses/batch-schema';
import type Config from '../lib/config.js';
import type { DataResponseType, ListDataResponseType, DataHistoryResponseType } from '../lib/types.js';
import {
    ListDataQuery,
    ListDataResponse,
    PatchDataBody,
    DataResponse,
    StandardResponse,
    DataHistoryQuery,
    DataHistoryResponse,
} from '../lib/types.js';

export default async function router(schema: Schema, config: Config) {
    await schema.get('/data', {
        name: 'List Data',
        group: 'Data',
        description: 'Get the latest successful run of a given geographic area',
        query: ListDataQuery,
        res: ListDataResponse,
    }, async (req, res) => {
        try {
            const data = await config.cacher.get(Cacher.Miss(req.query, 'data'), async () => {
                return await config.models.Data.list(req.query);
            });

            if (!req.auth || !req.auth.level || req.auth.level !== 'sponsor') {
                for (const d of data.items) {
                    delete (d as Record<string, unknown>).s3;
                    delete (d as Record<string, unknown>).s3_validated;
                }
            }

            return res.json(data.items as unknown as ListDataResponseType);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.patch('/data/:data', {
        name: 'Update Data',
        group: 'Data',
        description: 'Update an existing data object',
        params: Type.Object({
            data: Type.Integer(),
        }),
        body: PatchDataBody,
        res: DataResponse,
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            await config.models.Data.commit(req.params.data, req.body);

            await config.cacher.del('data');
            await config.cacher.del('licenses');

            return res.json(await config.models.Data.from(req.params.data) as unknown as DataResponseType);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.delete('/data/:data', {
        name: 'Delete Data',
        group: 'Data',
        description: 'Remove a given data entry',
        params: Type.Object({
            data: Type.Integer(),
        }),
        res: StandardResponse,
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            const data = await config.models.Data.from(req.params.data);
            await config.models.Data.delete(req.params.data);
            await config.cacher.del('data');
            await config.cacher.del('licenses');

            return res.json(data as unknown as import('../lib/types.js').StandardResponseType);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/data/:data', {
        name: 'Get Data',
        group: 'Data',
        description: 'Return all information about a specific data segment',
        params: Type.Object({
            data: Type.Integer(),
        }),
        res: DataResponse,
    }, async (req, res) => {
        try {
            const data = await config.models.Data.from(req.params.data);

            if (!req.auth || !req.auth.level || req.auth.level !== 'sponsor') {
                delete (data as Record<string, unknown>).s3;
                delete (data as Record<string, unknown>).s3_validated;
            }

            return res.json(data as unknown as DataResponseType);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/data/:data/history', {
        name: 'Return Data History',
        group: 'Data',
        description: 'Return the job history for a given data component',
        params: Type.Object({
            data: Type.Integer(),
        }),
        query: DataHistoryQuery,
        res: DataHistoryResponse,
    }, async (req, res) => {
        try {
            const history = await config.models.Data.history(req.params.data, req.query.status);

            return res.json(history as unknown as DataHistoryResponseType);
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
