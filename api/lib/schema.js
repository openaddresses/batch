'use strict';

const { Validator } = require('express-json-validator-middleware');
const $RefParser = require('json-schema-ref-parser');
const path = require('path');

class Schemas {
    constructor() {
        this.validator = new Validator({
            allErrors: true
        });

        this.schemas = new Map();
        this.validate = this.validator.validate;
    }

    async build() {
        this.schemas.set('GET /schema', {
            query: 'req.query.ListSchema.json'
        });
        this.schemas.set('POST /user', {
            body: 'req.body.CreateUser.json'
        });
        this.schemas.set('PATCH /user/:id', {
            body: 'req.body.PatchUser.json'
        });
        this.schemas.set('POST /login', {
            body: 'req.body.CreateLogin.json'
        });
        this.schemas.set('POST /login/forgot', {
            body: 'req.body.ForgotLogin.json'
        });
        this.schemas.set('POST /login/reset', {
            body: 'req.body.ResetLogin.json'
        });
        this.schemas.set('POST /token', {
            body: 'req.body.CreateToken.json'
        });
        this.schemas.set('POST /schedule', {
            body: 'req.body.Schedule.json'
        });
        this.schemas.set('POST /collections', {
            body: 'req.body.CreateCollection.json'
        });
        this.schemas.set('PATCH /collections/:collection', {
            body: 'req.body.PatchCollection.json'
        });
        this.schemas.set('GET /data', {
            query: 'req.query.ListData.json'
        });
        this.schemas.set('GET /run', {
            query: 'req.query.ListRuns.json'
        });
        this.schemas.set('POST /run', {
            body: 'req.body.CreateRun.json'
        });
        this.schemas.set('PATCH /run/:run', {
            body: 'req.body.PatchRun.json'
        });
        this.schemas.set('POST /run/:run/jobs', {
            body: 'req.body.SingleJobsCreate.json'
        });
        this.schemas.set('GET /job', {
            query: 'req.query.ListJobs.json'
        });
        this.schemas.set('PATCH /job/:job', {
            body: 'req.body.PatchJob.json'
        });
        this.schemas.set('POST /job/error', {
            body: 'req.body.ErrorCreate.json'
        });
        this.schemas.set('POST /job/error/:job', {
            body: 'req.body.ErrorModerate.json'
        });

        for (const schema of this.schemas.keys()) {
            const s = this.schemas.get(schema);

            for (const type of ['body', 'query']) {
                if (!s[type]) continue;
                s[type] = await $RefParser.dereference(path.resolve(__dirname, '../schema/', s[type]));
            }
        }
    }

    get(url) {
        const parsed = url.split(' ');
        if (parsed.length !== 2) throw new Error('schema.get() must be of format "<VERB> <URL>"');

        const info = this.schemas.get(url);
        if (!info) {
            this.schemas.set(url, {});
            return [parsed[1]];
        }

        const opts = {};
        if (info.query) opts.query = info.query;
        if (info.body) opts.body = info.body;

        const flow = [ parsed[1], [] ]

        if (info.query) flow[1].push(Schemas.query(info.query));

        flow[1].push(this.validate(opts));

        return flow;
    }

    /**
     * Express middleware to identify query params that should be integers according to the schema
     * and attempt to cast them as such to ensure they pass the schema
     */
    static query(schema) {
        return function (req, res, next) {
            for (const key of Object.keys(req.query)) {
                if (schema.properties[key] && schema.properties[key].type === 'integer') {
                    req.query[key] = parseInt(req.query[key]);
                }
            }

            return next();
        }
    }

    /**
     * Return all schemas (body, query, etc) for a given method + url
     *
     * @param {String} method HTTP Method
     * @param {String} url URL
     *
     * @returns {Object}
     */
    query(method, url) {
        if (!this.schemas.has(`${method} ${url}`)) {
            return { body: null, schema: null };
        }

        const schema = JSON.parse(JSON.stringify(this.schemas.get(`${method} ${url}`)));
        if (!schema.query) schema.query = null;
        if (!schema.body) schema.body = null;

        return schema;
    }

    /**
     * Return a list of endpoints with schemas
     *
     * @returns {Object}
     */
    list() {
        const lite = {};

        for (const key of this.schemas.keys()) {
            lite[key] = {
                body: !!this.schemas.get(key).body,
                query: !!this.schemas.get(key).query
            };
        }

        return lite;
    }
}

module.exports = Schemas;
