import Err from '@openaddresses/batch-error';
import { Webhooks } from '@octokit/webhooks';
import CI from '../lib/ci.js';

export default async function router(schema, config) {
    /**
     * @api {post} /api/github/event Github Webhook
     * @apiVersion 1.0.0
     * @apiName Github
     * @apiGroup Webhooks
     * @apiPermission admin
     *
     * @apiDescription
     *   Callback endpoint for GitHub Webhooks. Should not be called by user functions
     */
    await schema.post('/github/event', null, async (req, res) => {
        if (!process.env.GithubSecret) return res.status(400).send('Invalid X-Hub-Signature');

        const ci = new CI(config);

        const ghverify = new Webhooks({
            secret: process.env.GithubSecret
        });

        if (!ghverify.verify(req.body, req.headers['x-hub-signature'])) {
            res.status(400).send('Invalid X-Hub-Signature');
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
