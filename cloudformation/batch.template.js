'use strict';

const cf = require('@mapbox/cloudfriend');
const api = require('./api');
const batch = require('./batch');
const db = require('./db');
const schedule = require('./schedule');
const alarms = require('batch-alarms');

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
        BunnyToken: {
            Type: 'String',
            Description: '[secure] Bunny CDN Token for signing data downloads'
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
    alarms({
        prefix: 'Batch',
        email: 'nick@ingalls.ca',
        cluster: cf.ref('APIECSCluster'),
        service: cf.getAtt('APIService', 'Name'),
        loadbalancer: cf.getAtt('APIELB', 'LoadBalancerFullName'),
        targetgroup: cf.getAtt('APITargetGroup', 'TargetGroupFullName')

    }),
    // Every Friday
    schedule('sources', 'cron(0 12 ? * fri *)', 'Full Source Rebuild'),
    schedule('collect', 'cron(0 12 ? * sun *)', 'Collection Rebuild'),
    schedule('level',   'cron(0 10 ? * ? *)', 'Ensure all accounts have proper levels'),
    schedule('close',   'cron(0 11 * * ? *)', 'Close Expired Jobs')
);
