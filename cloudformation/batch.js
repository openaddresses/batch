'use strict';

const cf = require('@mapbox/cloudfriend');

const stack = {
    Resources: {
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
        BatchJobRole: {
            Type: 'AWS::IAM::Role',
            Properties: {
                AssumeRolePolicyDocument: {
                    Version: '2012-10-17',
                    Statement: [{
                        Effect: 'Allow',
                        Principal: {
                            Service: 'ecs-tasks.amazonaws.com'
                        },
                        Action: 'sts:AssumeRole'
                    }]
                },
                Policies: [{
                    PolicyName: 'batch-job-policy',
                    PolicyDocument: {
                        Statement: [{
                            Effect: 'Allow',
                            Action: [
                                's3:PutObject',
                                's3:GetObject'
                            ],
                            Resource: [cf.join(['arn:aws:s3:::', cf.ref('Bucket'), '/*'])]
                        },{
                            Effect: 'Allow' ,
                            Action: [
                                'batch:DescribeJobs'
                            ],
                            Resource: ['*']
                        }]
                    }
                }],
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
                LaunchTemplateName: cf.join('-', ['batch-mega', cf.ref('AWS::StackName')])
            }
        },
        BatchComputeEnvironment: {
            Type: 'AWS::Batch::ComputeEnvironment',
            Properties: {
                Type: 'MANAGED',
                ServiceRole: cf.getAtt('BatchServiceRole', 'Arn'),
                ComputeEnvironmentName: cf.join('-', ['batch', cf.ref('AWS::StackName')]),
                ComputeResources: {
                    AllocationStrategy: 'BEST_FIT_PROGRESSIVE',
                    BidPercentage: 80,
                    ImageId: 'ami-056807e883f197989',
                    MaxvCpus: 4,
                    DesiredvCpus: 0,
                    MinvCpus: 0,
                    SecurityGroupIds: [cf.ref('BatchSecurityGroup')],
                    Subnets:  [
                        'subnet-de35c1f5',
                        'subnet-e67dc7ea',
                        'subnet-38b72502',
                        'subnet-76ae3713',
                        'subnet-35d87242',
                        'subnet-b978ade0'
                    ],
                    Type : 'SPOT',
                    InstanceRole : cf.getAtt('BatchInstanceProfile', 'Arn'),
                    InstanceTypes : ['m5.large', 'c5.large']
                },
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
        BatchJobDefinition: {
            Type: 'AWS::Batch::JobDefinition',
            Properties: {
                Type: 'container',
                JobDefinitionName: cf.join('-', [cf.stackName, 'job']),
                RetryStrategy: {
                    Attempts: 1
                },
                Parameters: { },
                ContainerProperties: {
                    Environment: [{
                        Name: 'MAPBOX_TOKEN',
                        Value: cf.ref('MapboxToken')
                    },{
                        Name: 'SharedSecret',
                        Value: cf.ref('SharedSecret')
                    },{
                        Name: 'OA_BRANCH',
                        Value: cf.ref('Branch')
                    },{
                        Name: 'OA_API' ,
                        Value: cf.join(['http://', cf.getAtt('APIELB', 'DNSName')])
                    },{
                        Name: 'StackName',
                        Value: cf.stackName
                    },{
                        Name: 'Bucket',
                        Value: cf.ref('Bucket')
                    }],
                    Memory: 4000,
                    Privileged: true,
                    JobRoleArn: cf.getAtt('BatchJobRole', 'Arn'),
                    ReadonlyRootFilesystem: false,
                    Vcpus: 1,
                    Image: cf.join([cf.ref('AWS::AccountId'), '.dkr.ecr.', cf.ref('AWS::Region'), '.amazonaws.com/batch:task-', cf.ref('GitSha')])
                }
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
        BatchJobQueue: {
            'Type': 'AWS::Batch::JobQueue',
            'Properties': {
                'ComputeEnvironmentOrder': [{
                    'Order': 1,
                    'ComputeEnvironment': cf.ref('BatchComputeEnvironment')
                }],
                'State': 'ENABLED',
                'Priority': 1,
                'JobQueueName': cf.join('-', [cf.stackName, 'std-queue'])
            }
        },
        BatchCIJobQueue: {
            'Type': 'AWS::Batch::JobQueue',
            'Properties': {
                'ComputeEnvironmentOrder': [{
                    'Order': 1,
                    'ComputeEnvironment': cf.ref('BatchComputeEnvironment')
                }],
                'State': 'ENABLED',
                'Priority': 2,
                'JobQueueName': cf.join('-', [cf.stackName, 'std-ci-queue'])
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
                'JobQueueName': cf.join('-', [cf.stackName, 'meta-queue'])
            }
        }
    }
};

module.exports = stack;
