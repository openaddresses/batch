'use strict';

const cf = require('@mapbox/cloudfriend');

function schedule(type, cron, desc) {
    const stack =  {
        Resources: { }
    };

    const title = toTitleCase(type);

    stack.Resources[`${title}LambdaScheduleRole`] = {
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
    };

    stack.Resources[`${title}LambdaSchedule`] = {
        Type : 'AWS::Events::Rule',
        Properties: {
            ScheduleExpression: cron,
            State: 'ENABLED',
            Targets: [{
                Id: `${title}LambdaSchedule`,
                Arn: cf.getAtt(`${title}LambdaScheduleFunction`, 'Arn')
            }]
        }
    };

    stack.Resources[`${title}LambdaSchedulePermission`] = {
        Type: 'AWS::Lambda::Permission',
        Properties: {
            Action: 'lambda:InvokeFunction',
            FunctionName: cf.getAtt(`${title}LambdaScheduleFunction`, 'Arn'),
            Principal: 'events.amazonaws.com',
            SourceArn: cf.getAtt(`${title}LambdaSchedule`, 'Arn')
        }
    };

    stack.Resources[`${title}LambdaScheduleFunction`] = {
        Type: 'AWS::Lambda::Function',
        Properties: {
            Description: desc,
            Environment: {
                Variables: {
                    OA_API: cf.join(['http://', cf.getAtt('APIELB', 'DNSName')]),
                    SharedSecret: cf.sub('{{resolve:secretsmanager:${AWS::StackName}/api/signing-secret:SecretString::AWSCURRENT}}')
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
                            method: 'POST',
                            headers: {
                                'shared-secret': process.env.SharedSecret,
                                'content-type': 'application/json'
                            },
                        }, (res) => {
                              console.log('ok - status: ' + res.statusCode)
                        });

                        req.on('error', (err) => {
                            throw err;
                        });

                        req.write(JSON.stringify({
                            type: '${type}'
                        }));

                        req.end();
                    }

                    module.exports.handler = handler;
                `
            },
            Handler: 'index.handler',
            MemorySize: 128,
            Role: cf.getAtt(`${title}LambdaScheduleRole`, 'Arn'),
            Runtime: 'nodejs12.x',
            Timeout: '25'
        }
    };

    return stack;
}

function toTitleCase(str) {
    return str.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

module.exports = schedule;
