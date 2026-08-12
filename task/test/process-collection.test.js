import test from 'tape';
import { buildProcessedFeatures } from '../lib/process-collection.js';

function feature(props, coords) {
    return { type: 'Feature', properties: props, geometry: { type: 'Point', coordinates: coords } };
}

const EMPTY_BOUNDARIES = { region: [], district: [] };

test('buildProcessedFeatures dedupes across sources and backfills the survivor', (t) => {
    const sourceRecords = [
        {
            path: 'us/ca/statewide.json',
            features: [feature({ number: '1', street: 'Main St', region: 'CA', postcode: '' }, [-122, 38])]
        },
        {
            path: 'us/ca/alameda_county.json',
            features: [feature({ number: '1', street: 'Main Street', region: '', postcode: '94601' }, [-122, 38])]
        }
    ];

    const result = buildProcessedFeatures(sourceRecords, EMPTY_BOUNDARIES);

    t.equals(result.length, 1, 'the two sources duplicate to one output feature');
    // alameda_county.json already has a postcode, so dedupeFeatures keeps it as the
    // survivor (postcode presence outranks source priority); statewide.json is discarded.
    t.equals(result[0].properties.postcode, '94601', 'postcode kept from the record that already had one');
    t.equals(result[0].properties.region, 'CA', 'region backfilled from the discarded duplicate');
    t.deepEquals(result[0].properties.oa_backfill, ['region']);
    t.end();
});

test('buildProcessedFeatures skips features with missing/invalid geometry or properties', (t) => {
    const sourceRecords = [
        {
            path: 'a.json',
            features: [
                feature({ number: '1', street: 'Main St' }, [-122, 38]),
                { type: 'Feature', properties: { number: '2', street: 'Main St' }, geometry: null },
                { type: 'Feature', properties: { number: '3', street: 'Main St' } },
                { type: 'Feature', properties: null, geometry: { type: 'Point', coordinates: [1, 1] } }
            ]
        }
    ];

    const result = buildProcessedFeatures(sourceRecords, EMPTY_BOUNDARIES);

    t.equals(result.length, 1, 'only the feature with valid Point geometry and properties is kept');
    t.end();
});

test('buildProcessedFeatures passes each source its own priority rank', (t) => {
    const sourceRecords = [
        { path: 'us/ca/oakland.json', features: [feature({ number: '1', street: 'Main St', city: 'Oakland' }, [-122, 38])] },
        { path: 'us/ca/statewide.json', features: [feature({ number: '1', street: 'Main St', city: 'Wrong' }, [-122, 38])] }
    ];

    const result = buildProcessedFeatures(sourceRecords, EMPTY_BOUNDARIES);

    t.equals(result.length, 1);
    t.equals(result[0].properties.city, 'Oakland', 'city-level source (higher priority) wins over statewide source');
    t.end();
});
