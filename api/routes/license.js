import Err from '@openaddresses/batch-error';
import License from '../lib/types/license.js';

export default async function router(schema, config) {
    await schema.get('/licenses', {
        name: 'List Licenses',
        group: 'Licenses',
        auth: 'public',
        description: 'Return all sources grouped by license/attribution, for the OpenAddresses website attribution page',
        res: 'res.Licenses.json'
    }, async (req, res) => {
        try {
            const licenses = await config.cacher.get('licenses', async () => {
                return await License.list(config.pool);
            });

            return res.json(licenses);
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
