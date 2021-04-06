'use strict';

const cf = require('@mapbox/cloudfriend');

const stack = {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: 'OpenAddresses T3-Small Test',
    Parameters: {
        GitSha: {
            Type: 'String',
            Description: 'Gitsha to Deploy'
        },
        ComputeEnvironmentCluster: {
            Type: 'String',
            Description: 'Batch Compute Environment to populate',
            Default: 'batch-task-prod-t3_Batch_5a6a4042-84ad-38ff-bf7c-35ab884e81b2'
        }
    },
    Resources: {
        T3ClusterASG : {
            Type : 'AWS::AutoScaling::AutoScalingGroup',
            Properties : {
                VPCZoneIdentifier: [
                    'subnet-de35c1f5',
                    'subnet-e67dc7ea',
                    'subnet-38b72502',
                    'subnet-76ae3713',
                    'subnet-35d87242',
                    'subnet-b978ade0'
                ],
                LaunchConfigurationName : cf.ref('T3ClusterInstances'),
                MinSize : 1,
                MaxSize : 1,
                DesiredCapacity : 1
            },
            CreationPolicy : {
                ResourceSignal : {
                    Timeout : 'PT15M'
                }
            },
            UpdatePolicy: {
                AutoScalingRollingUpdate: {
                    MinInstancesInService: 0,
                    MaxBatchSize: 1,
                    PauseTime : 'PT15M',
                    WaitOnResourceSignals: 'true'
                }
            }
        },
        T3ClusterInstances: {
            Type: 'AWS::AutoScaling::LaunchConfiguration',
            'Metadata' : {
                'AWS::CloudFormation::Init' : {
                    'config' : {
                        'commands' : {
                            '01_add_instance_to_cluster' : {
                                'command' : cf.join(['#!/bin/bash\n', 'echo ECS_CLUSTER=', cf.ref('ComputeEnvironmentCluster'), ' >> /etc/ecs/ecs.config'])
                            }
                        },
                        'files' : {
                            '/etc/cfn/cfn-hup.conf' : {
                                'content' : { 'Fn::Join' : ['', [
                                    '[main]\n',
                                    'stack=', cf.stackId, '\n',
                                    'region=', cf.region, '\n'
                                ]] },
                                'mode'    : '000400',
                                'owner'   : 'root',
                                'group'   : 'root'
                            },
                            '/etc/cfn/hooks.d/cfn-auto-reloader.conf' : {
                                'content': { 'Fn::Join' : ['', [
                                    '[cfn-auto-reloader-hook]\n',
                                    'triggers=post.update\n',
                                    'path=Resources.T3ClusterInstances.Metadata.AWS::CloudFormation::Init\n',
                                    'action=/opt/aws/bin/cfn-init -v ',
                                    '         --stack ', cf.stackName,
                                    '         --resource T3ClusterInstances',
                                    '         --region ', cf.region, '\n',
                                    'runas=root\n'
                                ]] }
                            }
                        },
                        'services' : {
                            'sysvinit' : {
                                'cfn-hup' : { 'enabled' : 'true', 'ensureRunning' : 'true', 'files' : ['/etc/cfn/cfn-hup.conf', '/etc/cfn/hooks.d/cfn-auto-reloader.conf'] }
                            }
                        }
                    }
                }
            },
            Properties: {
                ImageId: 'ami-005425225a11a4777',
                InstanceType: 't3.small',
                SecurityGroups: [cf.ref('T3ClusterInstanceSecurityGroup')],
                IamInstanceProfile: cf.ref('T3ClusterInstanceProfile'),
                UserData: { 'Fn::Base64' : { 'Fn::Join' : ['', [
                    '#!/bin/bash -xe\n',
                    'yum install -y aws-cfn-bootstrap\n',

                    '/opt/aws/bin/cfn-init -v ',
                    '         --stack ', { 'Ref' : 'AWS::StackName' },
                    '         --resource T3ClusterInstances ',
                    '         --region ', { 'Ref' : 'AWS::Region' }, '\n',

                    '/opt/aws/bin/cfn-signal -e $? ',
                    '         --stack ', { 'Ref' : 'AWS::StackName' },
                    '         --resource T3ClusterASG ',
                    '         --region ', { 'Ref' : 'AWS::Region' }, '\n'
                ]] } }
            }
        },
        T3ClusterInstanceSecurityGroup: {
            Type: 'AWS::EC2::SecurityGroup',
            Properties: {
                VpcId: 'vpc-3f2aa15a',
                GroupDescription: cf.join([cf.stackName, '-default-t3cluster-sg']),
                SecurityGroupIngress: []
            }
        },
        T3ClusterInstanceRole: {
            Type: 'AWS::IAM::Role',
            Properties: {
                AssumeRolePolicyDocument: {
                    Statement: [{
                        Effect: 'Allow',
                        Principal: {
                            Service: ['ec2.amazonaws.com']
                        },
                        Action: ['sts:AssumeRole']
                    }]
                },
                Path: '/',
                Policies: [{
                    PolicyName: 'ecs-instance',
                    PolicyDocument: {
                        Statement: [{
                            Effect: 'Allow',
                            Action: [
                                'ecs:CreateCluster',
                                'ecs:DeregisterContainerInstance',
                                'ecs:DiscoverPollEndpoint',
                                'ecs:Poll',
                                'ecs:RegisterContainerInstance',
                                'ecs:StartTelemetrySession',
                                'ecs:Submit*',
                                'ecr:GetAuthorizationToken',
                                'ecr:BatchCheckLayerAvailability',
                                'ecr:GetDownloadUrlForLayer',
                                'ecr:BatchGetImage',
                                'logs:CreateLogStream',
                                'logs:PutLogEvents'
                            ],
                            Resource: '*'
                        }]
                    }
                }]
            }
        },
        T3ClusterInstanceProfile: {
            Type: 'AWS::IAM::InstanceProfile',
            Properties: {
                Path: '/',
                Roles: [cf.ref('T3ClusterInstanceRole')]
            }
        }
    }
};

module.exports = stack;
