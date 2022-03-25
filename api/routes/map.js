'use strict';
const { Err } = require('@openaddresses/batch-schema');
const Map = require('../lib/map');
const Cacher = require('../lib/cacher');
const Miss = Cacher.Miss;

async function router(schema, config) {
    /**
     * @api {get} /api/map Coverage TileJSON
     * @apiVersion 1.0.0
     * @apiName TileJSON
     * @apiGroup Map
     * @apiPermission public
     *
     * @apiDescription
     *   Data required for map initialization
     */
    await schema.get('/map', null, (req, res) => {
        return res.json(Map.map());
    });

    /**
     * @api {get} /api/map/features All Features
     * @apiVersion 1.0.0
     * @apiName MapFeatures
     * @apiGroup Map
     * @apiPermission public
     *
     * @apiDescription
     *   Return all map objects in Line Delimited GeoJSON
     */
    await schema.get('/map/features', {
        ':mapid': 'integer'
    }, async (req, res) => {
        return Map.stream(config.pool, res);
    });

    /**
     * @api {get} /api/map/:mapid Map Feature
     * @apiVersion 1.0.0
     * @apiName MapFeature
     * @apiGroup Map
     * @apiPermission public
     *
     * @apiDescription
     *   Get a single Map Object
     */
    await schema.get('/map/:mapid', {
        ':mapid': 'integer'
    }, async (req, res) => {
        return res.json(await Map.from_id(config.pool, req.params.mapid));
    });

    /**
     * @api {get} /api/map/borders/:z/:x/:y.mvt Borders MVT
     * @apiVersion 1.0.0
     * @apiName BorderVectorTile
     *   Retrive borders Mapbox Vector Tiles
     *
     * @apiParam {Number} z Z coordinate
     * @apiParam {Number} x X coordinate
     * @apiParam {Number} y Y coordinate
     */
    await schema.get('/map/borders/:z/:x/:y.mvt', {
        ':z': 'integer',
        ':x': 'integer',
        ':y': 'integer'
    }, async (req, res) => {
        try {
            if (req.params.z > 5) throw new Error(400, null, 'Up to z5 is supported');

            const tile = await config.cacher.get(Miss(req.query, `tile-borders-${req.params.z}-${req.params.x}-${req.params.y}`), async () => {
                return await Map.border_tile(config.pool, req.params.z, req.params.x, req.params.y);
            }, false);

            res.type('application/vnd.mapbox-vector-tile');

            return res.send(tile);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/map/:z/:x/:y.mvt Coverage MVT
     * @apiVersion 1.0.0
     * @apiName VectorTile
     * @apiGroup Map
     * @apiPermission public
     *
     * @apiDescription
     *   Retrive coverage Mapbox Vector Tiles
     *
     * @apiParam {Number} z Z coordinate
     * @apiParam {Number} x X coordinate
     * @apiParam {Number} y Y coordinate
     */
    await schema.get('/map/:z/:x/:y.mvt', {
        ':z': 'integer',
        ':x': 'integer',
        ':y': 'integer'
    }, async (req, res) => {
        try {
            if (req.params.z > 5) throw new Error(400, null, 'Up to z5 is supported');

            const tile = await config.cacher.get(Miss(req.query, `tile-${req.params.z}-${req.params.x}-${req.params.y}`), async () => {
                return await Map.tile(config.pool, req.params.z, req.params.x, req.params.y);
            }, false);

            res.type('application/vnd.mapbox-vector-tile');

            return res.send(tile);
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}

module.exports = router;
