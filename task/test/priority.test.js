import test from 'tape';
import { sourcePriority } from '../lib/priority.js';

test('sourcePriority ranks by granularity marker in filename', (t) => {
    t.equals(sourcePriority('us/ca/statewide.json'), 1, 'statewide file ranks as state-level');
    t.equals(sourcePriority('us/ca/alameda_county.json'), 2, 'county-marked file ranks as county-level');
    t.equals(sourcePriority('us/ca/countywide.json'), 2, 'countywide file ranks as county-level');
    t.equals(sourcePriority('us/ca/oakland.json'), 3, 'unmarked place file ranks as most local');
    t.equals(sourcePriority('nl/countrywide.json'), 0, 'countrywide file ranks as country-level');
    t.equals(sourcePriority('jp/nationwide.json'), 0, 'nationwide file ranks as country-level');
    t.ok(sourcePriority('us/ca/oakland.json') > sourcePriority('us/ca/alameda_county.json'),
        'city ranks more local than county');
    t.ok(sourcePriority('us/ca/alameda_county.json') > sourcePriority('us/ca/statewide.json'),
        'county ranks more local than state');
    t.ok(sourcePriority('us/ca/statewide.json') > sourcePriority('nl/countrywide.json'),
        'state ranks more local than country');
    t.end();
});
