import cf from '@openaddresses/cloudfriend';
import {
    ELB as ELBAlarms,
    RDS as RDSAlarms
} from '@openaddresses/batch-alarms';

import schedule from './lib/schedule.js';
import secret from './lib/secret.js';
import batch from './lib/batch.js';
import api from './lib/api.js';
import kms from './lib/kms.js';
import db from './lib/db.js';

const stack = {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: 'OpenAddresses Batch Processing',
    Parameters: {
        GitSha: {
            Type: 'String',
            Description: 'Gitsha to Deploy'
        },
        ProtomapsKey: {
            Type: 'String',
            Description: '[secure] Protomaps API Key to create Slippy Maps With'
        },
        Bucket: {
            Type: 'String',
            Description: 'S3 (AWS) Asset Storage'
        },
        R2Bucket: {
            Type: 'String',
            Description: 'R2 (Cloudflare) Asset Storage'
        },
        Branch: {
            Type: 'String',
            Description: 'Github branch to schedule source runs from',
            Default: 'master'
        }
    }
};

export default cf.merge(
    stack,
    db,
    api,
    kms,
    batch,
    secret,
    ELBAlarms({
        prefix: 'BatchELBAlarm',
        email: 'nick@ingalls.ca',
        apache: cf.stackName,
        cluster: cf.ref('APIECSCluster'),
        service: cf.getAtt('APIService', 'Name'),
        loadbalancer: cf.getAtt('APIELB', 'LoadBalancerFullName'),
        targetgroup: cf.getAtt('APITargetGroup', 'TargetGroupFullName')

    }),
    RDSAlarms({
        prefix: 'BatchRDSAlarm',
        email: 'nick@ingalls.ca',
        instance: cf.ref('DBInstanceVPC')
    }),
    // Every Friday
    schedule('scale',   'cron(0/5 * * * ? *)', 'Scale T3 Batch Cluster'),
    schedule('sources', 'cron(0 12 ? * fri *)', 'Full Source Rebuild'),
    schedule('collect', 'cron(0 12 ? * sun *)', 'Collection Rebuild'),
    schedule('level',   'cron(0 10 * * ? *)', 'Ensure all accounts have proper levels'),
    schedule('close',   'cron(0 11 * * ? *)', 'Close Expired Jobs')
);
