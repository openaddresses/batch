import Err from '@openaddresses/batch-error';
import Data from '../lib/types/data.js';
import Cacher from '../lib/cacher.js';
import Auth from '../lib/auth.js';
import { Type } from '@sinclair/typebox';
import {
    ListDataQuery,
    ListDataResponse,
    PatchDataBody,
    DataResponse,
    StandardResponse,
    DataHistoryQuery,
    DataHistoryResponse
} from '../lib/schema.js';

export default async function router(schema, config) {
    await schema.get('/data', {
        name: 'List Data',
        group: 'Data',
        description: 'Get the latest successful run of a given geographic area',
        query: ListDataQuery,
        res: ListDataResponse
    }, async (req, res) => {
        try {
            const data = await config.cacher.get(Cacher.Miss(req.query, 'data'), async () => {
                return await Data.list(config.pool, req.query);
            });

            if (!req.auth || !req.auth.level || req.auth.level !== 'sponsor') {
                for (const d of data.results) {
                    delete d.s3;
                    delete d.s3_validated;
                }
            }

            return res.json(data.results);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.patch('/data/:data', {
        name: 'Update Data',
        group: 'Data',
        description: 'Update an existing data object',
        params: Type.Object({
            data: Type.Integer()
        }),
        body: PatchDataBody,
        res: DataResponse
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            req.body.id = req.params.data;

            await config.cacher.del('data');
            await config.cacher.del('licenses');

            return res.json(await Data.commit(config.pool, req.body));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.delete('/data/:data', {
        name: 'Delete Data',
        group: 'Data',
        description: 'Remove a given data entry',
        params: Type.Object({
            data: Type.Integer()
        }),
        res: StandardResponse
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            const data = await Data.from(config.pool, req.params.data);
            await data.delete(config.pool);
            await config.cacher.del('data');
            await config.cacher.del('licenses');

            return res.json(data);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/data/:data', {
        name: 'Get Data',
        group: 'Data',
        description: 'Return all information about a specific data segment',
        params: Type.Object({
            data: Type.Integer()
        }),
        res: DataResponse
    }, async (req, res) => {
        try {
            const data = await Data.from(config.pool, req.params.data);

            if (!req.auth || !req.auth.level || req.auth.level !== 'sponsor') {
                delete data.s3;
                delete data.s3_validated;
            }

            return res.json(data);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/data/:data/history', {
        name: 'Return Data History',
        group: 'Data',
        description: 'Return the job history for a given data component',
        params: Type.Object({
            data: Type.Integer()
        }),
        query: DataHistoryQuery,
        res: DataHistoryResponse
    }, async (req, res) => {
        try {
            const history = await Data.history(config.pool, req.params.data, req.query.status);

            return res.json(history);
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
