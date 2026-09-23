import Err from '@openaddresses/batch-error';
import Auth from '../lib/auth.js';
import { Type } from '@sinclair/typebox';
import Schema from '@openaddresses/batch-schema';
import type Config from '../lib/config.js';
import type { LevelOverrideResponseType, ListLevelOverrideResponseType } from '../lib/types.js';
import {
    ListLevelOverrideQuery,
    ListLevelOverrideResponse,
    CreateLevelOverrideBody,
    LevelOverrideResponse,
    PatchLevelOverrideBody,
    StandardResponse,
} from '../lib/types.js';

export default async function router(schema: Schema, config: Config) {
    await schema.get('/level', {
        name: 'List Override',
        group: 'LevelOverride',
        description: 'List level overrides',
        query: ListLevelOverrideQuery,
        res: ListLevelOverrideResponse,
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            const list = await config.models.LevelOverride.list(req.query);

            return res.json({
                total: list.total,
                level_override: list.items,
            } as unknown as ListLevelOverrideResponseType);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.post('/level', {
        name: 'Create Override',
        group: 'LevelOverride',
        description: 'Create a new level override',
        body: CreateLevelOverrideBody,
        res: LevelOverrideResponse,
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            const level = await config.models.LevelOverride.generate(req.body);

            return res.json(level as unknown as LevelOverrideResponseType);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.patch('/level/:levelid', {
        name: 'Patch Override',
        group: 'LevelOverride',
        description: 'Patch a level override',
        params: Type.Object({
            levelid: Type.Integer(),
        }),
        body: PatchLevelOverrideBody,
        res: LevelOverrideResponse,
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            const level = await config.models.LevelOverride.commit(req.params.levelid, req.body);

            return res.json(level as unknown as LevelOverrideResponseType);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/level/:levelid', {
        name: 'Get Override',
        group: 'LevelOverride',
        description: 'Get a level override',
        params: Type.Object({
            levelid: Type.Integer(),
        }),
        res: LevelOverrideResponse,
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            const level = await config.models.LevelOverride.from(req.params.levelid);
            return res.json(level as unknown as LevelOverrideResponseType);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.delete('/level/:levelid', {
        name: 'Delete Override',
        group: 'LevelOverride',
        description: 'Delete a level override',
        params: Type.Object({
            levelid: Type.Integer(),
        }),
        res: StandardResponse,
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            await config.models.LevelOverride.delete(req.params.levelid);

            return res.json({
                status: 200,
                message: 'Delete Level Override',
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
