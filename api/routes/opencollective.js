import Err from '@openaddresses/batch-error';

export default async function router(schema) {
    await schema.post('/opencollective/event', {
        name: 'OpenCollective',
        group: 'Webhooks',
        auth: 'admin',
        description: 'Callback endpoint for OpenCollective. Should not be called by user functions'
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

