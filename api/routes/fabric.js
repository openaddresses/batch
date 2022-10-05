import Err from '@openaddresses/batch-error';
import Cacher from '../lib/cacher.js';

export default async function router(schema, config) {
    await schema.get('/fabric', {
        name: 'Fabric TileJSON',
        group: 'Map',
        auth: 'public',
        description: 'Return a TileJSON for the current fabric',
        res: 'res.TileJSON.json'
    }, async (req, res) => {
        try {
            res.json(config.tb.tilejson());
        } catch (err) {
            return Err.respond(new Err(404, err, 'No Tile Found'), res);
        }
    });

    await schema.get('/fabric/:z/:x/:y.mvt', {
        name: 'Fabric MVT',
        group: 'Map',
        auth: 'public',
        description: 'Retreive fabric Mapbox Vector Tiles',
        ':z': 'integer',
        ':x': 'integer',
        ':y': 'integer'
    }, async (req, res) => {
        let tile;
        try {
            const encodings = req.headers['accept-encoding'].split(',').map((e) => e.trim());
            if (!encodings.includes('gzip')) throw new Err(400, null, 'Accept-Encoding must include gzip');

            tile = await config.cacher.get(Cacher.Miss(req.query, `tile-fabric-${req.params.z}-${req.params.x}-${req.params.y}`), async () => {
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
