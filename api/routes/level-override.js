import Err from '@openaddresses/batch-error';
import LevelOverride from '../lib/types/level-override.js';
import Auth from '../lib/auth.js';
import { Type } from '@sinclair/typebox';
import {
    ListLevelOverrideQuery,
    ListLevelOverrideResponse,
    CreateLevelOverrideBody,
    LevelOverrideResponse,
    PatchLevelOverrideBody,
    StandardResponse
} from '../lib/schema.js';

export default async function router(schema, config) {
    await schema.get('/level', {
        name: 'List Override',
        group: 'LevelOverride',
        description: 'List level overrides',
        query: ListLevelOverrideQuery,
        res: ListLevelOverrideResponse
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            return res.json(await LevelOverride.list(config.pool, req.query));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.post('/level', {
        name: 'Create Override',
        group: 'LevelOverride',
        description: 'Create a new level override',
        body: CreateLevelOverrideBody,
        res: LevelOverrideResponse
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            const level = await LevelOverride.generate(config.pool, req.body);

            return res.json(level.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.patch('/level/:levelid', {
        name: 'Patch Override',
        group: 'LevelOverride',
        description: 'Patch a level override',
        params: Type.Object({
            levelid: Type.Integer()
        }),
        body: PatchLevelOverrideBody,
        res: LevelOverrideResponse
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            const level = await LevelOverride.commit(config.pool, req.params.levelid, req.body);

            return res.json(level.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/level/:levelid', {
        name: 'Get Override',
        group: 'LevelOverride',
        description: 'Get a level override',
        params: Type.Object({
            levelid: Type.Integer()
        }),
        res: LevelOverrideResponse
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            const level = await LevelOverride.from(config.pool, req.params.levelid);
            return res.json(level.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.delete('/level/:levelid', {
        name: 'Delete Override',
        group: 'LevelOverride',
        description: 'Delete a level override',
        params: Type.Object({
            levelid: Type.Integer()
        }),
        res: StandardResponse
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            await LevelOverride.delete(config.pool, req.params.levelid);

            return res.json({
                status: 200,
                message: 'Delete Level Override'
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
