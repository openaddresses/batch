import test from 'tape';
import { backfillFeature } from '../lib/backfill.js';

function feature(props, coords = [-122, 38]) {
    return { type: 'Feature', properties: props, geometry: { type: 'Point', coordinates: coords } };
}

const EMPTY_BOUNDARIES = { region: [], district: [] };

test('backfillFeature fills a blank field from a discarded duplicate', (t) => {
    const survivor = feature({ number: '1', street: 'Main St', region: '', postcode: '' });
    const discarded = [feature({ number: '1', street: 'Main St', region: 'CA', postcode: '94601' })];

    const result = backfillFeature(survivor, discarded, EMPTY_BOUNDARIES);

    t.equals(result.properties.region, 'CA');
    t.equals(result.properties.postcode, '94601');
    t.deepEquals(result.properties.oa_backfill.sort(), ['postcode', 'region']);
    t.end();
});

test('backfillFeature never overwrites a field the survivor already has', (t) => {
    const survivor = feature({ number: '1', street: 'Main St', region: 'NY' });
    const discarded = [feature({ number: '1', street: 'Main St', region: 'CA' })];

    const result = backfillFeature(survivor, discarded, EMPTY_BOUNDARIES);

    t.equals(result.properties.region, 'NY', 'existing value is preserved');
    t.equals(result.properties.oa_backfill, undefined, 'no backfill occurred, so no flag is added');
    t.end();
});

test('backfillFeature falls back to boundary lookup for region/district only', (t) => {
    const square = {
        type: 'Polygon',
        coordinates: [[[-123, 37], [-121, 37], [-121, 39], [-123, 39], [-123, 37]]]
    };
    const boundaries = {
        region: [{ code: 'us-ca', name: 'California', bbox: [-123, 37, -121, 39], geometry: square }],
        district: []
    };

    const survivor = feature({ number: '1', street: 'Main St', region: '', district: '', postcode: '' }, [-122, 38]);

    const result = backfillFeature(survivor, [], boundaries);

    t.equals(result.properties.region, 'California', 'region filled from boundary lookup');
    t.equals(result.properties.district, '', 'district stays blank - no district boundary was loaded');
    t.equals(result.properties.postcode, '', 'postcode is never filled from a boundary lookup');
    t.deepEquals(result.properties.oa_backfill, ['region']);
    t.end();
});

test('backfillFeature prefers a discarded duplicate value over a boundary lookup', (t) => {
    const square = {
        type: 'Polygon',
        coordinates: [[[-123, 37], [-121, 37], [-121, 39], [-123, 39], [-123, 37]]]
    };
    const boundaries = {
        region: [{ code: 'us-ca', name: 'California', bbox: [-123, 37, -121, 39], geometry: square }],
        district: []
    };

    const survivor = feature({ number: '1', street: 'Main St', region: '' }, [-122, 38]);
    const discarded = [feature({ number: '1', street: 'Main St', region: 'Calif.' })];

    const result = backfillFeature(survivor, discarded, boundaries);

    t.equals(result.properties.region, 'Calif.', 'duplicate value wins over boundary lookup');
    t.end();
});
