import Err from '@openaddresses/batch-error';
import { Webhooks } from '@octokit/webhooks';
import CI from '../lib/ci.js';
import Schema from '@openaddresses/batch-schema';
import type Config from '../lib/config.js';

export default async function router(schema: Schema, config: Config) {
    await schema.post('/github/event', {
        name: 'Github Webhook',
        group: 'Github',
        description: 'Callback endpoint for GitHub Webhooks. Should not be called by user functions',
    }, async (req, res) => {
        if (!process.env.GithubSecret) return res.status(400).send('Invalid X-Hub-Signature');

        const ci = new CI(config);

        const ghverify = new Webhooks({
            secret: process.env.GithubSecret,
        });

        const payload = (req.body as Buffer).toString('utf8');

        if (!ghverify.verify(payload, String(req.headers['x-hub-signature']))) {
            res.status(400).send('Invalid X-Hub-Signature');
        }

        let body: unknown;
        try {
            body = JSON.parse(payload);
        } catch (err) {
            res.status(400).send(`Invalid JSON Body: ${String(err)}`);
        }

        try {
            if (req.headers['x-github-event'] === 'push') {
                await ci.push(body as Parameters<CI['push']>[0]);

                res.json(true);
            } else if (req.headers['x-github-event'] === 'pull_request') {
                await ci.pull(body as Parameters<CI['pull']>[0]);

                res.json(true);
            } else {
                res.status(200).send('Accepted but ignored');
            }
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
