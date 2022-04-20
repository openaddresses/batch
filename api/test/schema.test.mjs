import fs from 'fs';
import path from 'path';
import test from 'tape';

import glob from 'glob';
import $RefParser from 'json-schema-ref-parser';
import Ajv from 'ajv';

const ajv = new Ajv({
    allErrors: true
});

glob.sync('../schema/**/*.json').forEach((source) => {
    test(`schema/${path.parse(source).base}`, async (t) => {
        try {
            const file = fs.readFileSync(source);
            t.ok(file.length, 'file loaded');

            JSON.parse(file);
        } catch (err) {
            t.error(err, 'no JSON errors');
        }

        try {
            const schema = await $RefParser.dereference(source);

            ajv.compile(schema);
        } catch (err) {
            t.error(err, 'no errors');
        }
        t.end();
    });
});
