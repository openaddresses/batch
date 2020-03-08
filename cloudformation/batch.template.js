'use strict';

const cf = require('@mapbox/cloudfriend');
const api = require('./api');
const batch = require('./batch');
const db = require('./db');

const stack = {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: 'OpenAddresses Batch Processing',
    Parameters: {
        GitSha: {
            Type: 'String',
            Description: 'Gitsha to Deploy'
        },
        Bucket: {
            Type: 'String',
            Description: 'S3 Asset Storage',
            Default: 'v2.openaddresses.io'
        }
    }
};

module.exports = cf.merge(
    stack,
    db,
    api,
    batch
);
