const fs = require('fs');
const path = require('path');
const test = require('tape');

const glob = require('glob');
const $RefParser = require('json-schema-ref-parser');
const Ajv = require('ajv');

const ajv = new Ajv({
    allErrors: true
});

glob.sync(path.resolve(__dirname, '../schema/**/*.json')).forEach((source) => {
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
