import Stats from '../lib/stats.js';
import test from 'tape';

test('Stats()', (t) => {
    try {
        new Stats();
        t.fail();
    } catch (err) {
        t.equals(err.message, 'Stats.file must be a URL');
    }

    try {
        new Stats('fake');
        t.fail();
    } catch (err) {
        t.equals(err.message, 'Stats.file must be a URL');
    }

    const stats = new Stats(new URL('./fixtures/addresses.geojson', import.meta.url), 'addresses');

    t.ok(/\/fixtures\/addresses.geojson/.test(stats.file), 'stats.file: <geojson>');
    t.deepEquals(stats.stats, {
        count: 0,
        bounds: [],
        addresses: {
            counts: {
                unit: 0,
                number: 0,
                street: 0,
                city: 0,
                district: 0,
                region: 0,
                postcode: 0
            },
            validity: {
                valid: 0,
                failures: {
                    geometry: 0,
                    number: 0,
                    street: 0
                }
            }
        }
    }, 'stats.stats: { ... }');

    t.end();
});

test('Stats#calc', async (t) => {
    const stats = new Stats(new URL('./fixtures/addresses.geojson', import.meta.url), 'addresses');

    try {
        await stats.calc();
    } catch (err) {
        t.error(err);
    }

    t.deepEquals(stats.stats.bounds, [-74.9834588, 40.0546411, -74.9679742, 40.0614019], 'Stats.stats.bounds: [ ... ]');
    t.equals(stats.stats.count, 100, 'stats.stats.count: 100');

    t.deepEquals(stats.stats.addresses, {
        counts: {
            unit: 0,
            number: 83,
            street: 100,
            city: 100,
            district: 0,
            region: 0,
            postcode: 0
        },
        validity: {
            valid: 83,
            failures: {
                geometry: 0,
                number: 17,
                street: 0
            }
        }
    }, 'stats.stats.addresses: { ... }');

    t.end();
});
