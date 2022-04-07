'use strict';
const { Err } = require('@openaddresses/batch-schema');
const Map = require('../lib/map');
const Cacher = require('../lib/cacher');
const Miss = Cacher.Miss;

async function router(schema, config) {
    /**
     * @api {get} /api/fabric Fabric TileJSON
     * @apiVersion 1.0.0
     * @apiName FabricVectorTile
     * @apiGroup Map
     * @apiPermission public
     *
     * @apiDescription
     *   Return a TileJSON for the current fabric
     *
     * @apiSchema {jsonschema=../schema/res.TileJSON.json} apiSuccess
     */
    await schema.get('/fabric', {
        res: 'res.TileJSON.json'
    }, async (req, res) => {
        try {
            res.json(config.tb.tilejson());
        } catch (err) {
            return Err.respond(new Err(404, err, 'No Tile Found'), res);
        }
    });

    /**
     * @api {get} /api/fabric/:z/:x/:y.mvt Fabric MVT
     * @apiVersion 1.0.0
     * @apiName FabricVectorTile
     * @apiGroup Map
     * @apiPermission public
     *
     * @apiDescription
     *   Retrive fabric Mapbox Vector Tiles
     *
     * @apiParam {Number} z Z coordinate
     * @apiParam {Number} x X coordinate
     * @apiParam {Number} y Y coordinate
     */
    await schema.get('/fabric/:z/:x/:y.mvt', {
        ':z': 'integer',
        ':x': 'integer',
        ':y': 'integer'
    }, async (req, res) => {
        let tile;
        try {
            const encodings = req.headers['accept-encoding'].split(',').map((e) => e.trim());
            if (!encodings.includes('gzip')) throw new Err(400, null, 'Accept-Encoding must include gzip');

            tile = await config.cacher.get(Miss(req.query, `tile-fabric-${req.params.z}-${req.params.x}-${req.params.y}`), async () => {
                return await config.tb.tile(req.params.z, req.params.x, req.params.y);
            }, false);
        } catch (err) {
            return Err.respond(err, res);
        }

        res.writeHead(200, {
            'Content-Type': 'application/vnd.mapbox-vector-tile',
            'Content-Encoding': 'gzip',
            'cache-control': 'no-transform'
        });
        res.end(tile);
    });
}

module.exports = router;
