import test from 'tape';
import { isValidFeature } from '../lib/valid-feature.js';

function feature(props, coords) {
    return { type: 'Feature', properties: props, geometry: { type: 'Point', coordinates: coords } };
}

test('isValidFeature accepts a well-formed Point feature', (t) => {
    t.ok(isValidFeature(feature({ number: '1' }, [-122, 38])));
    t.end();
});

test('isValidFeature rejects missing/invalid geometry or properties', (t) => {
    t.notOk(isValidFeature(null), 'null feature');
    t.notOk(isValidFeature({ type: 'Feature', properties: { number: '2' }, geometry: null }), 'null geometry');
    t.notOk(isValidFeature({ type: 'Feature', properties: { number: '3' } }), 'missing geometry');
    t.notOk(isValidFeature({ type: 'Feature', properties: null, geometry: { type: 'Point', coordinates: [1, 1] } }), 'null properties');
    t.notOk(isValidFeature({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [] } }), 'non-Point geometry');
    t.notOk(isValidFeature({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [1] } }), 'coordinates missing an axis');
    t.end();
});
