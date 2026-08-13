import test from 'tape';
import { dedupeFeatures } from '../lib/dedupe.js';

function feature(lon, lat, props) {
    return {
        type: 'Feature',
        properties: props,
        geometry: { type: 'Point', coordinates: [lon, lat] }
    };
}

test('dedupeFeatures collapses matching duplicates and prefers higher priority', (t) => {
    const records = [
        { feature: feature(-122.27, 37.80, { number: '123', street: 'Main St', region: '' }), sourcePath: 'us/ca/statewide.json', priority: 1 },
        { feature: feature(-122.27, 37.80, { number: '123', street: 'Main Street', region: 'CA' }), sourcePath: 'us/ca/alameda_county.json', priority: 2 }
    ];

    const survivors = dedupeFeatures(records);

    t.equals(survivors.length, 1, 'two matching records collapse to one survivor');
    t.equals(survivors[0].feature.properties.region, 'CA', 'survivor is from the higher-priority (more local) source');
    t.equals(survivors[0].discarded.length, 1, 'the lower-priority record is kept as discarded, not dropped');
    t.equals(survivors[0].discarded[0].properties.region, '', 'discarded record retains its original fields');
    t.end();
});

test('dedupeFeatures prefers a record with a populated postcode over priority', (t) => {
    const records = [
        { feature: feature(10, 10, { number: '5', street: 'Elm Rd', postcode: '' }), sourcePath: 'us/ca/alameda_county.json', priority: 2 },
        { feature: feature(10, 10, { number: '5', street: 'Elm Rd', postcode: '94601' }), sourcePath: 'us/ca/statewide.json', priority: 1 }
    ];

    const survivors = dedupeFeatures(records);

    t.equals(survivors.length, 1);
    t.equals(survivors[0].feature.properties.postcode, '94601', 'record with postcode wins even though it has lower priority');
    t.end();
});

test('dedupeFeatures keeps non-matching records separate', (t) => {
    const records = [
        { feature: feature(-122.27, 37.80, { number: '123', street: 'Main St' }), sourcePath: 'a.json', priority: 3 },
        { feature: feature(-122.27, 37.80, { number: '456', street: 'Main St' }), sourcePath: 'b.json', priority: 3 },
        { feature: feature(10, 10, { number: '123', street: 'Main St' }), sourcePath: 'c.json', priority: 3 }
    ];

    const survivors = dedupeFeatures(records);

    t.equals(survivors.length, 3, 'different house numbers and far-apart coordinates are not deduped');
    t.end();
});

test('dedupeFeatures ignores records missing number or street', (t) => {
    const records = [
        { feature: feature(1, 1, { number: '', street: 'Main St' }), sourcePath: 'a.json', priority: 3 },
        { feature: feature(1, 1, { number: '1', street: '' }), sourcePath: 'b.json', priority: 3 }
    ];

    const survivors = dedupeFeatures(records);

    t.equals(survivors.length, 2, 'records without both number and street are never matched to each other');
    t.end();
});

test('dedupeFeatures keeps distinct units of a multi-unit building', (t) => {
    // A multi-unit building geocoded to one rooftop point: identical number
    // and street, same coordinates, different units. Collapsing these would
    // silently delete every unit but one.
    const records = [
        { feature: feature(-122.27, 37.80, { number: '100', street: 'Main St', unit: 'Apt 1' }), sourcePath: 'a.json', priority: 3 },
        { feature: feature(-122.27, 37.80, { number: '100', street: 'Main St', unit: 'Apt 2' }), sourcePath: 'a.json', priority: 3 },
        { feature: feature(-122.27, 37.80, { number: '100', street: 'Main St', unit: 'Apt 3' }), sourcePath: 'a.json', priority: 3 }
    ];

    const survivors = dedupeFeatures(records);

    t.equals(survivors.length, 3, 'each distinct unit survives');
    t.deepEquals(
        survivors.map((s) => s.feature.properties.unit).sort(),
        ['Apt 1', 'Apt 2', 'Apt 3'],
        'no unit is discarded'
    );
    t.end();
});

test('dedupeFeatures dedupes records that agree on number, street and unit', (t) => {
    const records = [
        { feature: feature(-122.27, 37.80, { number: '100', street: 'Main Street', unit: 'apt 4', city: '' }), sourcePath: 'us/ca/statewide.json', priority: 1 },
        { feature: feature(-122.27, 37.80, { number: '100', street: 'Main St', unit: 'APT  4', city: 'Oakland' }), sourcePath: 'us/ca/oakland.json', priority: 3 }
    ];

    const survivors = dedupeFeatures(records);

    t.equals(survivors.length, 1, 'matching unit values (case/whitespace insensitive) still dedupe');
    t.equals(survivors[0].feature.properties.city, 'Oakland', 'the higher-priority source wins');
    t.end();
});

test('dedupeFeatures does not treat a blank unit as matching a populated one', (t) => {
    const records = [
        { feature: feature(-122.27, 37.80, { number: '100', street: 'Main St' }), sourcePath: 'a.json', priority: 3 },
        { feature: feature(-122.27, 37.80, { number: '100', street: 'Main St', unit: '' }), sourcePath: 'b.json', priority: 2 },
        { feature: feature(-122.27, 37.80, { number: '100', street: 'Main St', unit: 'Ste 200' }), sourcePath: 'c.json', priority: 1 }
    ];

    const survivors = dedupeFeatures(records);

    t.equals(survivors.length, 2, 'the two blank-unit records collapse, the suite stays separate');
    t.ok(
        survivors.some((s) => s.feature.properties.unit === 'Ste 200'),
        'the record with a unit is not absorbed into the blank-unit group'
    );
    t.end();
});

test('dedupeFeatures matches near-duplicates that fall in an adjacent grid cell', (t) => {
    // 0.00005deg offset (~5.5m) - close enough to land one cell over, well
    // within the 3x3 neighborhood search, but not in the exact same cell.
    const records = [
        { feature: feature(-122.27000, 37.80000, { number: '10', street: 'Elm Rd' }), sourcePath: 'a.json', priority: 3 },
        { feature: feature(-122.26995, 37.80005, { number: '10', street: 'Elm Road' }), sourcePath: 'b.json', priority: 3 }
    ];

    const survivors = dedupeFeatures(records);

    t.equals(survivors.length, 1, 'near-duplicates within tolerance are matched despite landing in different grid cells');
    t.end();
});

test('dedupeFeatures does not match points just outside the grid neighborhood', (t) => {
    // ~0.05deg (~5.5km) apart - many grid cells away, outside the 3x3
    // neighborhood regardless of matching number/street.
    const records = [
        { feature: feature(-122.27, 37.80, { number: '10', street: 'Elm Rd' }), sourcePath: 'a.json', priority: 3 },
        { feature: feature(-122.22, 37.85, { number: '10', street: 'Elm Rd' }), sourcePath: 'b.json', priority: 3 }
    ];

    const survivors = dedupeFeatures(records);

    t.equals(survivors.length, 2, 'points far outside the grid neighborhood are never compared, even with identical number/street');
    t.end();
});

test('dedupeFeatures collapses a three-way duplicate spanning three sources', (t) => {
    const records = [
        { feature: feature(5, 5, { number: '7', street: 'Oak Ave', city: '' }), sourcePath: 'us/ca/statewide.json', priority: 1 },
        { feature: feature(5, 5, { number: '7', street: 'Oak Ave', city: '' }), sourcePath: 'us/ca/alameda_county.json', priority: 2 },
        { feature: feature(5, 5, { number: '7', street: 'Oak Ave', city: 'Oakland' }), sourcePath: 'us/ca/oakland.json', priority: 3 }
    ];

    const survivors = dedupeFeatures(records);

    t.equals(survivors.length, 1, 'all three sources collapse to a single survivor');
    t.equals(survivors[0].feature.properties.city, 'Oakland', 'the most local (highest priority) of the three wins');
    t.equals(survivors[0].discarded.length, 2, 'both other sources are kept as discarded for backfill');
    t.end();
});
