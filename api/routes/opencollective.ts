import Err from '@openaddresses/batch-error';
import Schema from '@openaddresses/batch-schema';

export default async function router(schema: Schema) {
    await schema.post('/opencollective/event', {
        name: 'OpenCollective',
        group: 'Webhooks',
        description: 'Callback endpoint for OpenCollective. Should not be called by user functions',
    }, async (req, res) => {
        try {
            console.error(req.headers);
            console.error(req.body);

            res.status(200).send('Accepted but ignored');
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
