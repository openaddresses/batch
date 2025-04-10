import Err from '@openaddresses/batch-error';
import { Webhooks } from '@octokit/webhooks';
import bodyparser from 'body-parser';
import CI from '../lib/ci.js';

export default async function router(schema, config) {
    await schema.post('/github/event', {
        name: 'Github Webhook',
        group: 'Github',
        auth: 'admin',
        description: 'Callback endpoint for GitHub Webhooks. Should not be called by user functions'
    }, bodyparser.text({ type: '*/*', limit: '500kb' }), async (req, res) => {
        if (!process.env.GithubSecret) return res.status(400).send('Invalid X-Hub-Signature');

        const ci = new CI(config);

        const ghverify = new Webhooks({
            secret: process.env.GithubSecret
        });

        const payload = req.body.toString('utf8');

        if (!ghverify.verify(payload, req.headers['x-hub-signature'])) {
            res.status(400).send('Invalid X-Hub-Signature');
        }

        try {
            req.body = JSON.parse(payload);
        } catch (err) {
            res.status(400).send(`Invalid JSON Body: ${String(err)}`);
        }

        try {
            if (req.headers['x-github-event'] === 'push') {
                await ci.push(config.pool, req.body);

                res.json(true);
            } else if (req.headers['x-github-event'] === 'pull_request') {
                await ci.pull(config.pool, req.body);

                res.json(true);
            } else {
                res.status(200).send('Accepted but ignored');
            }
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
