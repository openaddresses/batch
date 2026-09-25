import Err from '@openaddresses/batch-error';
import Auth from '../lib/auth.js';
import Token from '../lib/token.js';
import { Type } from '@sinclair/typebox';
import Schema from '@openaddresses/batch-schema';
import type Config from '../lib/config.js';
import {
    ListTokensResponse,
    CreateTokenBody,
    CreateTokenResponse,
    StandardResponse,
} from '../lib/types.js';

export default async function router(schema: Schema, config: Config) {
    const token = new Token(config.pool);

    await schema.get('/token', {
        name: 'List Tokens',
        group: 'Token',
        description: 'List all tokens associated with the requester\'s account',
        res: ListTokensResponse,
    }, async (req, res) => {
        try {
            const auth = await Auth.is_auth(req);

            return res.json(await token.list(auth));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.post('/token', {
        name: 'Create Tokens',
        group: 'Token',
        description: 'Create a new API token for programatic access',
        body: CreateTokenBody,
        res: CreateTokenResponse,
    }, async (req, res) => {
        try {
            const auth = await Auth.is_auth(req);

            return res.json(await token.generate(auth, req.body.name));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.delete('/token/:id', {
        name: 'Delete Tokens',
        group: 'Token',
        description: 'Delete a user\'s API Token',
        params: Type.Object({
            id: Type.Integer(),
        }),
        res: StandardResponse,
    }, async (req, res) => {
        try {
            const auth = await Auth.is_auth(req);

            return res.json(await token.delete(auth, req.params.id));
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
