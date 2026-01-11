import Stats from '../lib/stats.js';
import test from 'tape';

test('Stats handles null/empty address properties', async (t) => {
    const stats = new Stats(new URL('./fixtures/addresses-with-nulls.geojson', import.meta.url), 'addresses');

    try {
        await stats.calc();
    } catch (err) {
        t.error(err, 'calc should not throw');
    }

    t.equals(stats.stats.count, 3, 'stats.stats.count: 3 features');

    t.deepEquals(stats.stats.addresses.counts, {
        unit: 0,
        number: 1,
        street: 1,
        city: 1,
        district: 0,
        region: 0,
        postcode: 0
    }, 'counts should ignore null/empty values and count only present trimmed values');

    t.end();
});
