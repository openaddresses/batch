'use strict';

const cf = require('@mapbox/cloudfriend');

const stack = {
    Resources: {
        BatchJobRole: {
            Type: 'AWS::IAM::Role',
            Properties: {
                AssumeRolePolicyDocument: {
                    Version: '2012-10-17',
                    Statement: [{
                        Effect: 'Allow',
                        Principal: { Service: 'ecs-tasks.amazonaws.com' },
                        Action: 'sts:AssumeRole'
                    }]
                },
                Policies: [{
                    PolicyName: 'batch-job-policy',
                    PolicyDocument: {
                        Statement: [{
                            Effect: 'Allow',
                            Action: ['s3:PutObject', 's3:GetObject'],
                            Resource: [cf.join(['arn:aws:s3:::', cf.ref('Bucket'), '/*'])]
                        },{
                            Effect: 'Allow' ,
                            Action: ['batch:DescribeJobs'],
                            Resource: ['*']
                        },{
                            Effect: 'Allow' ,
                            Action: ['ecs:DescribeContainerInstances'],
                            Resource: ['*']
                        },{
                            Effect: 'Allow' ,
                            Action: ['autoscaling:SetInstanceProtection'],
                            Resource: ['*']
                        }]
                    }
                }],
                Path: '/'
            }
        },
        BatchJobDefinition: {
            Type: 'AWS::Batch::JobDefinition',
            Properties: {
                Type: 'container',
                JobDefinitionName: cf.join('-', [cf.stackName, 'job']),
                RetryStrategy: { Attempts: 1 },
                Parameters: { },
                ContainerProperties: {
                    Environment: [
                        { Name: 'T3_CLUSTER_ASG', Value: cf.importValue('t3-cluster-asg') },
                        { Name: 'MAPBOX_TOKEN', Value: cf.ref('MapboxToken') },
                        { Name: 'SharedSecret', Value: cf.ref('SharedSecret') },
                        { Name: 'OA_BRANCH', Value: cf.ref('Branch') },
                        { Name: 'OA_API' , Value: cf.join(['http://', cf.getAtt('APIELB', 'DNSName')]) },
                        { Name: 'StackName', Value: cf.stackName },
                        { Name: 'Bucket', Value: cf.ref('Bucket') }
                    ],
                    Memory: 1900,
                    Privileged: true,
                    JobRoleArn: cf.getAtt('BatchJobRole', 'Arn'),
                    ReadonlyRootFilesystem: false,
                    Vcpus: 2,
                    Image: cf.join([cf.ref('AWS::AccountId'), '.dkr.ecr.', cf.ref('AWS::Region'), '.amazonaws.com/batch:task-', cf.ref('GitSha')])
                }
            }
        }
    }
};

module.exports = stack;
