import Err from '@openaddresses/batch-error';
import Level from '../lib/level.js';

export default async function router(schema, config) {
    const level = new Level(config.pool);

    await schema.post('/opencollective/event', {
        name: 'OpenCollective',
        group: 'Webhooks',
        description: 'Callback endpoint for OpenCollective. Should not be called by user functions'
    }, async (req, res) => {
        try {
            console.error(req.headers);
            console.error(req.body);

            // OpenCollective doesn't publicly document the webhook payload shape,
            // so rather than trust parsing of an unverified event body, react
            // broadly to anything membership/payment related and let the existing
            // (already correct) bulk sync pull the level & contribution id straight
            // from OpenCollective's API.
            const type = req.body && req.body.type ? String(req.body.type) : '';
            if (/member|order|transaction|subscription/i.test(type)) {
                level.all().catch((err) => {
                    console.error('Failed to refresh levels from OpenCollective webhook (non-fatal):', err);
                });
            }

            res.status(200).send('Accepted');
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}

