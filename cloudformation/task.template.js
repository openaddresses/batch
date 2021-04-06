'use strict';

const cf = require('@mapbox/cloudfriend');
const stack = {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: 'OpenAddresses Batch T3 Compute Environment',
    Resources: {
        BatchT3ComputeEnvironment: {
            Type: 'AWS::Batch::ComputeEnvironment',
            Properties: {
                Type: 'UNMANAGED',
                ServiceRole: cf.getAtt('BatchServiceRole', 'Arn'),
                ComputeEnvironmentName: cf.join('-', [cf.stackName, 't3']),
                State: 'ENABLED'
            }
        },
        BatchMegaComputeEnvironment: {
            Type: 'AWS::Batch::ComputeEnvironment',
            Properties: {
                Type: 'MANAGED',
                ServiceRole: cf.getAtt('BatchServiceRole', 'Arn'),
                ComputeEnvironmentName: cf.join('-', ['batch-hg', cf.ref('AWS::StackName')]),
                ComputeResources: {
                    ImageId: 'ami-056807e883f197989',
                    MaxvCpus: 16,
                    DesiredvCpus: 0,
                    MinvCpus: 0,
                    SecurityGroupIds: [cf.ref('BatchSecurityGroup')],
                    LaunchTemplate: {
                        LaunchTemplateId: cf.ref('BatchMegaLaunchTemplate'),
                        Version: cf.getAtt('BatchMegaLaunchTemplate', 'LatestVersionNumber')
                    },
                    Subnets:  [
                        'subnet-de35c1f5',
                        'subnet-e67dc7ea',
                        'subnet-38b72502',
                        'subnet-76ae3713',
                        'subnet-35d87242',
                        'subnet-b978ade0'
                    ],
                    Type : 'EC2',
                    InstanceRole : cf.getAtt('BatchInstanceProfile', 'Arn'),
                    InstanceTypes : ['m5.large', 'c5.large']
                },
                State: 'ENABLED'
            }
        },
        BatchInstanceRole: {
            Type: 'AWS::IAM::Role',
            Properties: {
                AssumeRolePolicyDocument: {
                    Version: '2012-10-17',
                    Statement: [{
                        Effect: 'Allow',
                        Principal: {
                            Service: 'ec2.amazonaws.com'
                        },
                        Action: 'sts:AssumeRole'
                    }]
                },
                ManagedPolicyArns: ['arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role'],
                Path: '/'
            }
        },
        BatchInstanceProfile: {
            Type: 'AWS::IAM::InstanceProfile',
            Properties: {
                Roles: [cf.ref('BatchInstanceRole')],
                Path: '/'
            }
        },
        BatchMegaLaunchTemplate: {
            Type: 'AWS::EC2::LaunchTemplate',
            Properties: {
                LaunchTemplateData: {
                    BlockDeviceMappings: [{
                        DeviceName: '/dev/xvda',
                        Ebs: {
                            Encrypted: true,
                            VolumeSize: 250,
                            VolumeType: 'gp2'
                        }
                    }]
                },
                LaunchTemplateName: cf.join('-', [cf.stackName, 'mega'])
            }
        },
        BatchSecurityGroup: {
            'Type': 'AWS::EC2::SecurityGroup',
            'Properties': {
                'VpcId': 'vpc-3f2aa15a',
                'GroupDescription': 'Batch Security Group',
                SecurityGroupIngress: []
            }
        },
        BatchServiceRole: {
            Type: 'AWS::IAM::Role',
            Properties: {
                AssumeRolePolicyDocument: {
                    Version: '2012-10-17',
                    Statement: [{
                        Effect: 'Allow',
                        Principal: {
                            Service: 'batch.amazonaws.com'
                        },
                        Action: 'sts:AssumeRole'
                    }]
                },
                ManagedPolicyArns: ['arn:aws:iam::aws:policy/service-role/AWSBatchServiceRole'],
                Path: '/service-role/'
            }
        },
        BatchJobQueue: {
            'Type': 'AWS::Batch::JobQueue',
            'Properties': {
                'ComputeEnvironmentOrder': [{
                    'Order': 1,
                    'ComputeEnvironment': cf.ref('BatchT3ComputeEnvironment')
                }],
                'State': 'ENABLED',
                'Priority': 1,
                'JobQueueName': cf.join('-', [cf.stackName, 't3'])
            }
        },
        BatchMegaJobQueue: {
            'Type': 'AWS::Batch::JobQueue',
            'Properties': {
                'ComputeEnvironmentOrder': [{
                    'Order': 1,
                    'ComputeEnvironment': cf.ref('BatchMegaComputeEnvironment')
                }],
                'State': 'ENABLED',
                'Priority': 1,
                'JobQueueName': cf.join('-', [cf.stackName, 'mega'])
            }
        },
        BatchCIJobQueue: {
            'Type': 'AWS::Batch::JobQueue',
            'Properties': {
                'ComputeEnvironmentOrder': [{
                    'Order': 1,
                    'ComputeEnvironment': cf.ref('BatchT3ComputeEnvironment')
                }],
                'State': 'ENABLED',
                'Priority': 2,
                'JobQueueName': cf.join('-', [cf.stackName, 't3-priority'])
            }
        }
    }
};

module.exports = stack;
