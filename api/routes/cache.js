import Err from '@openaddresses/batch-error';
import Auth from '../lib/auth.js';
import { Type } from '@sinclair/typebox';
import {
    StandardResponse
} from '../lib/schema.js';

export default async function router(schema, config) {
    schema.delete('/cache', {
        name: 'Flush Cache',
        group: 'Cache',
        description: 'Flush the Memcached Cache',
        res: StandardResponse
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            await config.cacher.flush();

            res.json({
                status: 200,
                message: 'Cache Flushed'
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    schema.delete('/cache/:cache_key', {
        name: 'Delete Key',
        group: 'Cache',
        description: 'Flush the Memcached Cache',
        params: Type.Object({
            cache_key: Type.String()
        }),
        res: StandardResponse
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            await config.cacher.del(req.params.cache_key);

            res.json({
                status: 200,
                message: 'Key Flushed'
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
