import cf from '@openaddresses/cloudfriend';

export default {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: 'OpenAddresses Batch T3 Compute Environment',
    Resources: {
        BatchT3ComputeEnvironment: {
            Type: 'AWS::Batch::ComputeEnvironment',
            Properties: {
                Type: 'UNMANAGED',
                ServiceRole: cf.getAtt('BatchServiceRole', 'Arn'),
                ComputeEnvironmentName: 't3',
                State: 'ENABLED'
            }
        },
        BatchMegaComputeEnvironment: {
            Type: 'AWS::Batch::ComputeEnvironment',
            Properties: {
                Type: 'MANAGED',
                ServiceRole: cf.getAtt('BatchServiceRole', 'Arn'),
                ComputeEnvironmentName: 'mega',
                ComputeResources: {
                    ImageId: 'ami-0914ebfbccd143a3f',
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
                            VolumeType: 'gp3'
                        }
                    }]
                },
                LaunchTemplateName: 'mega'
            }
        },
        BatchSecurityGroup: {
            Type: 'AWS::EC2::SecurityGroup',
            Properties: {
                VpcId: 'vpc-3f2aa15a',
                GroupDescription: 'Batch Security Group',
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
            Type: 'AWS::Batch::JobQueue',
            Properties: {
                ComputeEnvironmentOrder: [{
                    Order: 1,
                    ComputeEnvironment: cf.ref('BatchT3ComputeEnvironment')
                }],
                State: 'ENABLED',
                Priority: 1,
                JobQueueName: 't3'
            }
        },
        BatchMegaJobQueue: {
            Type: 'AWS::Batch::JobQueue',
            Properties: {
                ComputeEnvironmentOrder: [{
                    Order: 1,
                    ComputeEnvironment: cf.ref('BatchMegaComputeEnvironment')
                }],
                State: 'ENABLED',
                Priority: 1,
                JobQueueName: 'mega'
            }
        },
        BatchPriorityJobQueue: {
            Type: 'AWS::Batch::JobQueue',
            Properties: {
                ComputeEnvironmentOrder: [{
                    Order: 1,
                    ComputeEnvironment: cf.ref('BatchT3ComputeEnvironment')
                }],
                State: 'ENABLED',
                Priority: 2,
                JobQueueName: 't3-priority'
            }
        }
    },
    Outputs: {
        T3PriorityQueue: {
            Description: 'T3 Priority Queue',
            Value: cf.ref('BatchPriorityJobQueue'),
            Export: {
                Name: 't3-priority-queue'
            }
        },
        T3Queue: {
            Description: 'T3 Priority Queue',
            Value: cf.ref('BatchJobQueue'),
            Export: {
                Name: 't3-queue'
            }
        },
        MegaQueue: {
            Description: 'Mega Queue',
            Value: cf.ref('BatchMegaJobQueue'),
            Export: {
                Name: 'mega-queue'
            }
        }
    }
};
