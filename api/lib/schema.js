'use strict';

const { Validator, ValidationError } = require('express-json-validator-middleware');
const $RefParser = require('json-schema-ref-parser');

class Schemas {
    constructor() {
        this.validator = new Validator({
            allErrors: true
        });

        this.schemas = new Map();
        this.validate = this.validator.validate;
    }

    async build() {
        this.schemas.set('POST /user', {
            body: './schema/req.body.CreateUser.json'
        });

        this.schemas.set('PATCH /user/:id', {
            body: './schema/req.body.PatchUser.json'
        });
        this.schemas.set('POST /login', {
            body: './schema/req.body.CreateLogin.json'
        });
        this.schemas.set('POST /login/forgot', {
            body: './schema/req.body.ForgotLogin.json'
        });
        this.schemas.set('POST /login/reset', {
            body: './schema/req.body.ResetLogin.json'
        });
        this.schemas.set('POST /token', {
            body: './schema/req.body.CreateToken.json'
        });
        this.schemas.set('POST /schedule', {
            body: './schema/req.body.Schedule.json'
        });
        this.schemas.set('POST /collections', {
            body: './schema/req.body.CreateCollection.json'
        });
        this.schemas.set('PATCH /collections/:collection', {
            body: './schema/req.body.PatchCollection.json'
        });
        this.schemas.set('GET /data', {
            query: './schema/req.query.ListData.json'
        });
        this.schemas.set('GET /run', {
            query: './schema/req.query.ListRuns.json'
        });
        this.schemas.set('POST /run', {
            body: './schema/req.body.CreateRun.json'
        });
        this.schemas.set('PATCH /run/:run', {
            body: './schema/req.body.PatchRun.json'
        });
        this.schemas.set('POST /run/:run/jobs', {
            body: './schema/req.body.SingleJobsCreate.json'
        });
        this.schemas.set('GET /job', {
            query: './schema/req.query.ListJobs.json'
        });
        this.schemas.set('POST /job/error', {
            body: './schema/req.body.ErrorCreate.json'
        });
        this.schemas.set('POST /job/error/:job', {
            body: './schema/req.body.ErrorModerate.json'
        });
        this.schemas.set('PATCH /job/:job', {
            body: './schema/req.body.PatchJob.json'
        });

        for (const schema of this.schemas.keys()) {
            const s = this.schemas.get(schema);

            for (const type of ['body', 'query']) {
                if (!s[type]) continue;
                s[type] = await $RefParser.dereference(s[type]);
            }
        }
    }

    get(url) {
        const parsed = url.split(' ');
        if (parsed.length !== 2) throw new Error('schema.get() must be of format "<VERB> <URL>"')

        const info = this.schemas.get(url);

        if (!info) return [parsed[1]]

        const opts = {};
        if (info.query) opts.query = info.query;
        if (info.body) opts.body = info.body;
        return [
            parsed[1],
            this.validate(opts)
        ]
    }

    list() {
        return {
            schemas: Array.from(this.schemas.keys())
        }
    }
}

module.exports = Schemas
