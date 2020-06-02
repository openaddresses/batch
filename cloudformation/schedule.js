'use strict';

const cf = require('@mapbox/cloudfriend');

const stack = {
    Resources: {
        LambdaSchedule: {
            Type : 'AWS::Events::Rule',
            Properties: {
                Description: 'Biweekly Friday @ 12 UTM',
                ScheduleExpression: 'cron(0 12 ? * fri *)',
                State: 'ENABLED',
                Targets: [{
                    Id: 'LambdaSchedule',
                    Arn: cf.getAtt('LambdaScheduleFunction', 'Arn')
                }]
            }
        },
        LambdaScheduleRole: {
            Type: 'AWS::IAM::Role',
            Properties: {
                AssumeRolePolicyDocument: {
                    Version: '2012-10-17',
                    Statement: [{
                        Effect: 'Allow',
                        Principal: {
                            Service: ['lambda.amazonaws.com']
                        },
                        Action: ['sts:AssumeRole']
                    }]
                },
                ManagedPolicyArns: [
                    'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
                ]
            }
        },
        LambdaSchedulePermission: {
            Type: 'AWS::Lambda::Permission',
            Properties: {
                Action: 'lambda:InvokeFunction',
                FunctionName: cf.getAtt('LambdaScheduleFunction', 'Arn'),
                Principal: 'events.amazonaws.com',
                SourceArn: cf.getAtt('LambdaSchedule', 'Arn')
            }
        },
        LambdaScheduleFunction: {
            Type: 'AWS::Lambda::Function',
            Properties: {
                Description: 'Biweekly Scheduled Runs',
                Environment: {
                    Variables: {
                        OA_API: cf.join(['http://', cf.getAtt('APIELB', 'DNSName')])
                    }
                },
                Code: {
                    ZipFile: `
                        function handler() {
                            const http = require('http');

                            const req = http.request({
                                hostname: new URL(process.env.OA_API).hostname,
                                port: 80,
                                path: '/api/schedule',
                                method: 'POST'
                            }, (res) => {
                                  console.log('ok - status: ' + res.statusCode)
                            });

                            req.on('error', (err) => {
                                throw err;
                            });

                            req.end();
                        }

                        module.exports.handler = handler;
                    `
                },
                Handler: 'index.handler',
                MemorySize: 128,
                Role: cf.getAtt('LambdaScheduleRole', 'Arn'),
                Runtime: 'nodejs12.x',
                Timeout: '25'
            }
        }
    }
};

module.exports = stack;
