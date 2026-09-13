import Err from '@openaddresses/batch-error';
import Auth from '../lib/auth.js';
import Token from '../lib/token.js';
import { Type } from '@sinclair/typebox';
import {
    ListTokensResponse,
    CreateTokenBody,
    CreateTokenResponse,
    StandardResponse
} from '../lib/schema.js';

export default async function router(schema, config) {
    const token = new Token(config.pool);

    await schema.get('/token', {
        name: 'List Tokens',
        group: 'Token',
        description: 'List all tokens associated with the requester\'s account',
        res: ListTokensResponse
    }, async (req, res) => {
        try {
            await Auth.is_auth(req);

            return res.json(await token.list(req.auth));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.post('/token', {
        name: 'Create Tokens',
        group: 'Token',
        description: 'Create a new API token for programatic access',
        body: CreateTokenBody,
        res: CreateTokenResponse
    }, async (req, res) => {
        try {
            await Auth.is_auth(req);

            return res.json(await token.generate(req.auth, req.body.name));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.delete('/token/:id', {
        name: 'Delete Tokens',
        group: 'Token',
        description: 'Delete a user\'s API Token',
        params: Type.Object({
            id: Type.Integer()
        }),
        res: StandardResponse
    }, async (req, res) => {
        try {
            await Auth.is_auth(req);

            return res.json(await token.delete(req.auth, req.params.id));
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
