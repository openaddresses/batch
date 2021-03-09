#!/usr/bin/env node

'use strict';
const OA = require('lib-oa');

const oa = new OA({
    url: process.env.OA_API,
    secret: process.env.SharedSecret
});
