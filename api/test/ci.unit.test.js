'use strict';

const CI = require('../lib/ci');
const test = require('tape');

test('CI()', (t) => {
    t.end();
});

test('CI#fileprep', (t) => {
    t.deepEquals(CI.fileprep([
        'sources/us/ca/orange.json'
    ], '1234'), [
        'https://raw.githubusercontent.com/openaddresses/openaddresses/1234/sources/us/ca/orange.json'
    ], 'single unique file');

    t.deepEquals(CI.fileprep([
        'sources/ca/ca/orange.json',
        'sources/us/ca/orange.json'
    ], '1234'), [
        'https://raw.githubusercontent.com/openaddresses/openaddresses/1234/sources/ca/ca/orange.json',
        'https://raw.githubusercontent.com/openaddresses/openaddresses/1234/sources/us/ca/orange.json'
    ], 'multi unique files');

    t.deepEquals(CI.fileprep([
        'package.json',
        'sources/ca/ca/orange.json',
        'test/test.js',
        'sources/us/ca/orange.json'
    ], '1234'), [
        'https://raw.githubusercontent.com/openaddresses/openaddresses/1234/sources/ca/ca/orange.json',
        'https://raw.githubusercontent.com/openaddresses/openaddresses/1234/sources/us/ca/orange.json'
    ], 'multi unique files w/ non-sources');

    t.deepEquals(CI.fileprep([
        'sources/us/ca/orange.json',
        'package.json',
        'sources/ca/ca/orange.json',
        'test/test.js',
        'sources/us/ca/orange.json',
        'sources/ca/ca/orange.json'
    ], '1234'), [
        'https://raw.githubusercontent.com/openaddresses/openaddresses/1234/sources/ca/ca/orange.json',
        'https://raw.githubusercontent.com/openaddresses/openaddresses/1234/sources/us/ca/orange.json'
    ], 'multi unique files w/ non-sources & dupes');

    t.end();
});
