import test from 'tape';
import { normalizeNumber, normalizeStreet } from '../lib/normalize.js';

test('normalizeNumber', (t) => {
    t.equals(normalizeNumber('123'), '123');
    t.equals(normalizeNumber('123-A'), '123a');
    t.equals(normalizeNumber(''), '');
    t.equals(normalizeNumber(null), '');
    t.equals(normalizeNumber(undefined), '');
    t.end();
});

test('normalizeStreet', (t) => {
    t.equals(normalizeStreet('Main Street'), 'main st');
    t.equals(normalizeStreet('MAIN ST.'), 'main st');
    t.equals(normalizeStreet('North Main Avenue'), 'n main ave');
    t.equals(normalizeStreet('  Elm  Blvd  '), 'elm blvd');
    t.equals(normalizeStreet(''), '');
    t.equals(normalizeStreet(null), '');
    t.end();
});
