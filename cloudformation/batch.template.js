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
        },
        SlackWebhookUrl: {
            Type: 'String',
            Description: 'Slack Incoming Webhook URL for batch job notifications'
        }
    },
    Resources: {
        BatchNotifyRule: {
            Type: 'AWS::Events::Rule',
            Properties: {
                Description: 'Notify Slack on scheduled batch job state changes',
                EventPattern: {
                    source: ['aws.batch'],
                    'detail-type': ['Batch Job State Change'],
                    detail: {
                        status: ['RUNNING', 'SUCCEEDED', 'FAILED'],
                        jobName: [{
                            prefix: 'OA_Collect'
                        }, {
                            prefix: 'OA_Fabric'
                        }, {
                            prefix: 'OA_Sources'
                        }]
                    }
                },
                State: 'ENABLED',
                Targets: [{
                    Id: 'BatchNotifyLambda',
                    Arn: cf.getAtt('BatchNotifyFunction', 'Arn')
                }]
            }
        },
        BatchNotifyPermission: {
            Type: 'AWS::Lambda::Permission',
            Properties: {
                Action: 'lambda:InvokeFunction',
                FunctionName: cf.getAtt('BatchNotifyFunction', 'Arn'),
                Principal: 'events.amazonaws.com',
                SourceArn: cf.getAtt('BatchNotifyRule', 'Arn')
            }
        },
        BatchNotifyRole: {
            Type: 'AWS::IAM::Role',
            Properties: {
                AssumeRolePolicyDocument: {
                    Version: '2012-10-17',
                    Statement: [{
                        Effect: 'Allow',
                        Principal: { Service: 'lambda.amazonaws.com' },
                        Action: 'sts:AssumeRole'
                    }]
                },
                ManagedPolicyArns: [
                    'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
                ],
                Policies: [{
                    PolicyName: 'BatchNotifyLogs',
                    PolicyDocument: {
                        Statement: [{
                            Effect: 'Allow',
                            Action: ['logs:GetLogEvents'],
                            Resource: ['arn:aws:logs:*:*:log-group:/aws/batch/job:*']
                        }]
                    }
                }]
            }
        },
        BatchNotifyFunction: {
            Type: 'AWS::Lambda::Function',
            Properties: {
                Description: 'Send Slack notifications for batch job state changes',
                Environment: {
                    Variables: {
                        SLACK_WEBHOOK_URL: cf.ref('SlackWebhookUrl')
                    }
                },
                Code: {
                    ZipFile: `
const https = require('https');
const { CloudWatchLogsClient, GetLogEventsCommand } = require('@aws-sdk/client-cloudwatch-logs');
const cwl = new CloudWatchLogsClient();

exports.handler = async function(event) {
    const detail = event.detail;
    const jobName = detail.jobName;
    const status = detail.status;
    const jobId = detail.jobId;
    const reason = detail.statusReason || '';
    const logStream = (detail.container && detail.container.logStreamName) || '';
    const region = event.region || 'us-east-1';

    const emoji = status === 'SUCCEEDED' ? ':white_check_mark:' : status === 'RUNNING' ? ':arrow_forward:' : ':x:';

    const blocks = [];
    blocks.push({
        type: 'section',
        text: {
            type: 'mrkdwn',
            text: emoji + ' *' + jobName + '* ' + status.toLowerCase() + (reason ? '\\n>' + reason : '')
        }
    });

    if (status === 'FAILED' && logStream) {
        try {
            const resp = await cwl.send(new GetLogEventsCommand({
                logGroupName: '/aws/batch/job',
                logStreamName: logStream,
                limit: 30,
                startFromHead: false
            }));

            const lines = (resp.events || [])
                .map(function(e) { return e.message.trim(); })
                .filter(function(l) { return l.length > 0 && l.length < 200; })
                .slice(-15);

            if (lines.length > 0) {
                blocks.push({
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: '*Last log lines:*\\n\\\`\\\`\\\`\\n' + lines.join('\\n') + '\\n\\\`\\\`\\\`'
                    }
                });
            }
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        }

        const cwUrl = 'https://' + region + '.console.aws.amazon.com/cloudwatch/home?region=' + region
            + '#logsV2:log-groups/log-group/$252Faws$252Fbatch$252Fjob/log-events/' + encodeURIComponent(logStream).replace(/%/g, '$25');

        blocks.push({
            type: 'context',
            elements: [{
                type: 'mrkdwn',
                text: '<' + cwUrl + '|View logs in CloudWatch>'
            }]
        });
    }

    const payload = JSON.stringify({ blocks: blocks });

    return new Promise(function(resolve, reject) {
        const url = new URL(process.env.SLACK_WEBHOOK_URL);
        const req = https.request({
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, function(res) {
            console.log('Slack response:', res.statusCode);
            resolve();
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
};
                    `
                },
                Handler: 'index.handler',
                MemorySize: 128,
                Role: cf.getAtt('BatchNotifyRole', 'Arn'),
                Runtime: 'nodejs22.x',
                Timeout: '30'
            }
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
    schedule('fabric',  'cron(0 18 ? * sun *)', 'Rebuild Border & Fabric Tiles'),
    schedule('level',   'cron(0 10 * * ? *)', 'Ensure all accounts have proper levels'),
    schedule('close',   'cron(0 11 * * ? *)', 'Close Expired Jobs')
);
