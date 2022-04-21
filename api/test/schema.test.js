import fs from 'fs';
import path from 'path';
import test from 'node:test';
import assert from 'assert';

import glob from 'glob';
import $RefParser from 'json-schema-ref-parser';
import Ajv from 'ajv';

const ajv = new Ajv({
    allErrors: true
});

for (const source of glob.sync('../schema/**/*.json')) {
    test(`schema/${path.parse(source).base}`, async (t) => {
        try {
            const file = fs.readFileSync(source);
            assert.ok(file.length, 'file loaded');

            JSON.parse(file);
        } catch (err) {
            assert.ifError(err, 'no JSON errors');
        }

        try {
            const schema = await $RefParser.dereference(source);

            ajv.compile(schema);
        } catch (err) {
            assert.ifError(err, 'no errors');
        }
    });
}
