import fs from 'fs';
import path from 'path';
import test from 'node:test';
import assert from 'assert';

import { globSync } from 'glob';
import $RefParser from 'json-schema-ref-parser';

// eslint-disable-next-line n/no-extraneous-import
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({
    allErrors: true
});

addFormats(ajv);

for (const source of globSync(new URL('../schema/**.json', import.meta.url).pathname)) {
    test(`schema/${path.parse(source).base}`, async () => {
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
