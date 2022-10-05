import Err from '@openaddresses/batch-error';
import Map from '../lib/types/map.js';
import Cacher from '../lib/cacher.js';

export default async function router(schema, config) {
    await schema.get('/map', {
        name: 'Coverage TileJSON',
        group: 'Map',
        auth: 'public',
        description: 'Data required for map initialization'
    }, (req, res) => {
        return res.json(Map.map());
    });

    await schema.get('/map/features', {
        name: 'All Features',
        group: 'Map',
        auth: 'public',
        description: 'Return all map objects in Line Delimited GeoJSON'
    }, async (req, res) => {
        (await Map.stream(config.pool, res)).pipe(res);
    });

    await schema.get('/map/:mapid', {
        name: 'Map Feature',
        group: 'Map',
        auth: 'public',
        description: 'Get a single Map Object',
        ':mapid': 'integer'
    }, async (req, res) => {
        return res.json(await Map.from_id(config.pool, req.params.mapid));
    });

    await schema.get('/map/:z/:x/:y.mvt', {
        name: 'Coverage MVT',
        group: 'Map',
        auth: 'public',
        description: 'Retreive coverage MVT',
        ':z': 'integer',
        ':x': 'integer',
        ':y': 'integer'
    }, async (req, res) => {
        try {
            const encodings = req.headers['accept-encoding'].split(',').map((e) => e.trim());
            if (!encodings.includes('gzip')) throw new Err(400, null, 'Accept-Encoding must include gzip');

            const tile = await config.cacher.get(Cacher.Miss(req.query, `tile-border-${req.params.z}-${req.params.x}-${req.params.y}`), async () => {
                return await config.borders.tile(req.params.z, req.params.x, req.params.y);
            }, false);

            res.writeHead(200, {
                'Content-Type': 'application/vnd.mapbox-vector-tile',
                'Content-Encoding': 'gzip',
                'cache-control': 'no-transform'
            });
            res.end(tile);
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
