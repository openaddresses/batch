import test from 'node:test';
import assert from 'assert';
import { KindGuard } from '@sinclair/typebox';
// eslint-disable-next-line n/no-extraneous-import
import { Ajv } from 'ajv';
import * as schemas from '../lib/types.js';

const ajv = new Ajv({
    strict: false,
    allErrors: true
});

for (const [name, schema] of Object.entries(schemas)) {
    if (!KindGuard.IsSchema(schema)) continue;

    test(`lib/schema.js: ${name}`, () => {
        try {
            ajv.compile(schema);
        } catch (err) {
            assert.ifError(err, 'no errors');
        }
    });
}
