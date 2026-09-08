import test from 'tape';
import { buildShardFeatures } from '../lib/process-shard.js';

function feature(props, coords) {
    return { type: 'Feature', properties: props, geometry: { type: 'Point', coordinates: coords } };
}

const EMPTY_BOUNDARIES = { region: [], district: [] };

test('buildShardFeatures dedupes within a single tile\'s core records', (t) => {
    const core = new Map([
        ['us/ca/statewide.json', [feature({ number: '1', street: 'Main St', region: 'CA' }, [-122, 38])]],
        ['us/ca/oakland.json', [feature({ number: '1', street: 'Main Street', region: '' }, [-122, 38])]]
    ]);

    const result = buildShardFeatures(core, new Map(), EMPTY_BOUNDARIES);

    t.equals(result.length, 1, 'the two sources collapse to one survivor');
    t.equals(result[0].properties.region, 'CA', 'the more local source wins the region field');
    t.end();
});

test('buildShardFeatures drops a group whose winner is a borrowed record', (t) => {
    // The higher-priority, higher-postcode record only exists as borrowed -
    // it belongs to a neighboring tile's core set and must not be emitted
    // here even though it wins the match.
    const core = new Map([
        ['us/ca/statewide.json', [feature({ number: '1', street: 'Main St', postcode: '' }, [-122, 38])]]
    ]);
    const borrowed = new Map([
        ['us/ca/oakland.json', [feature({ number: '1', street: 'Main St', postcode: '94601' }, [-122, 38])]]
    ]);

    const result = buildShardFeatures(core, borrowed, EMPTY_BOUNDARIES);

    t.equals(result.length, 0, 'a group won by a borrowed record is emitted by its own home tile instead');
    t.end();
});

test('buildShardFeatures emits a core winner even when a borrowed record loses the match', (t) => {
    const core = new Map([
        ['us/ca/oakland.json', [feature({ number: '1', street: 'Main St', postcode: '94601' }, [-122, 38])]]
    ]);
    const borrowed = new Map([
        ['us/ca/statewide.json', [feature({ number: '1', street: 'Main St', postcode: '' }, [-122, 38])]]
    ]);

    const result = buildShardFeatures(core, borrowed, EMPTY_BOUNDARIES);

    t.equals(result.length, 1, 'the core record still wins and is emitted');
    t.equals(result[0].properties.postcode, '94601');
    t.end();
});

test('buildShardFeatures backfills the emitted survivor from a borrowed duplicate', (t) => {
    const core = new Map([
        ['us/ca/oakland.json', [feature({ number: '1', street: 'Main St', region: '' }, [-122, 38])]]
    ]);
    const borrowed = new Map([
        ['us/ca/statewide.json', [feature({ number: '1', street: 'Main St', region: 'CA' }, [-122, 38])]]
    ]);

    const result = buildShardFeatures(core, borrowed, EMPTY_BOUNDARIES);

    t.equals(result.length, 1);
    t.equals(result[0].properties.region, 'CA', 'backfilled from the borrowed record even though the core record wins');
    t.deepEquals(result[0].properties.oa_backfill, ['region']);
    t.end();
});
