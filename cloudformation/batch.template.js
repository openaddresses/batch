'use strict';

const cf = require('@mapbox/cloudfriend');
const api = require('./api');
const batch = require('./batch');
const db = require('./db');
const schedule = require('./schedule');

const stack = {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: 'OpenAddresses Batch Processing',
    Parameters: {
        GitSha: {
            Type: 'String',
            Description: 'Gitsha to Deploy'
        },
        MapboxToken: {
            Type: 'String',
            Description: '[secure] Mapbox API Token to create Slippy Maps With'
        },
        Bucket: {
            Type: 'String',
            Description: 'S3 Asset Storage'
        },
        Branch: {
            Type: 'String',
            Description: 'Github branch to schedule source runs from',
            Default: 'master'
        }
    }
};

module.exports = cf.merge(
    stack,
    db,
    api,
    batch,
    schedule('sources', 'cron(0 12 ? * fri *)'),
    schedule('collect', 'cron(0 12 ? * sun *)'),
    schedule('close',   'cron(0 11 * * ? *)')
);
