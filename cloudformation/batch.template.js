const cf = require('@mapbox/cloudfriend');

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
        SSLCertificateIdentifier: {
            Type: 'String',
            Description: 'SSL certificate for HTTPS protocol',
            Default: ''
        }
    },
    Resources: {
        AWSBatchServiceRole: {
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
                ManagedPolicyArns: [ 'arn:aws:iam::aws:policy/service-role/AWSBatchServiceRole' ],
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
                ManagedPolicyArns: [ 'arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role' ],
                Path: '/'
            }
        },
        BatchInstanceProfile: {
            Type: 'AWS::IAM::InstanceProfile',
            Properties: {
                Roles: [ cf.ref('BatchInstanceRole') ],
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
                            Action: [ 's3:GetObject' ],
                            Resource: [ 'arn:aws:s3:::data.openaddresses.io/*' ]
                        }]
                    }
                }],
                Path: '/'
            }
        },
        BatchComputeEnvironment: {
            Type: 'AWS::Batch::ComputeEnvironment',
            Properties: {
                Type: 'MANAGED',
                ServiceRole: cf.getAtt('AWSBatchServiceRole', 'Arn'),
                ComputeEnvironmentName: cf.join('-', ['batch', cf.ref('AWS::StackName')]),
                ComputeResources: {
                    ImageId: 'ami-056807e883f197989',
                    MaxvCpus: 128,
                    DesiredvCpus: 32,
                    MinvCpus: 0,
                    SecurityGroupIds: [ cf.ref('SecurityGroup') ],
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
                    InstanceTypes : [ 'optimal' ]
                },
                State: 'ENABLED'
            }
        },
        BatchJobDefinition: {
            'Type': 'AWS::Batch::JobDefinition',
            'Properties': {
                'Type': 'container',
                'JobDefinitionName': 'batch-job',
                'RetryStrategy': {
                    'Attempts': 1
                },
                'Parameters': { },
                'ContainerProperties': {
                    'Command': [ './task.js', ],
                    'Environment': [{
                        'Name': 'MapboxToken',
                        'Value': cf.ref('MapboxToken')
                    }],
                    'Memory': 4000,
                    'Privileged': true,
                    'JobRoleArn': cf.getAtt('BatchJobRole', 'Arn'),
                    'ReadonlyRootFilesystem': false,
                    'Vcpus': 2,
                    'Image': cf.join([cf.ref('AWS::AccountId'), '.dkr.ecr.', cf.ref('AWS::Region'), '.amazonaws.com/batch:', cf.ref('GitSha')])
                }
            }
        },
        SecurityGroup: {
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
                'JobQueueName': 'HighPriority'
            }
        },
        LambdaExecutionRole: {
            'Type': 'AWS::IAM::Role',
            'Properties': {
                'AssumeRolePolicyDocument': {
                    'Version': '2012-10-17',
                    'Statement': [{
                        'Effect': 'Allow',
                        'Principal':{
                            'Service': [ 'lambda.amazonaws.com' ]
                        },
                        'Action': [ 'sts:AssumeRole' ]
                    }]
                },
                'Path': '/',
                'Policies': [{
                    'PolicyName': 'lambda-batch',
                    'PolicyDocument': {
                        'Statement': [{
                            'Effect': 'Allow',
                            'Action': [ 'batch:SubmitJob' ],
                            'Resource': 'arn:aws:batch:*:*:*'
                        }]
                    }
                },{
                    'PolicyName': 'lambda-logs',
                    'PolicyDocument': {
                        'Version': '2012-10-17',
                        'Statement': [{
                            'Effect': 'Allow',
                            'Action': [ 'logs:*' ],
                            'Resource': 'arn:aws:logs:*:*:*'
                        }]
                    }
                },{
                    'PolicyName': 'lambda-s3',
                    'PolicyDocument': {
                        'Statement': [{
                            'Effect': 'Allow',
                            'Action': [ 's3:GetObject' ],
                            'Resource': [ 'arn:aws:s3:::openaddresses-lambdas/*' ]
                        }]
                    }
                }]
            }
        },
        LambdaTriggerFunction: {
            Type: 'AWS::Lambda::Function',
            Properties: {
                Handler: 'index.trigger',
                Role: cf.getAtt('LambdaExecutionRole', 'Arn'),
                FunctionName: cf.join('-', [cf.stackName, 'invoke']),
                Code: {
                    S3Bucket: 'openaddresses-lambdas',
                    S3Key: cf.join(['batch/', cf.ref('GitSha'), '.zip' ])
                },
                Environment: {
                    Variables: {
                        JOB_DEFINITION: cf.ref('BatchJobDefinition'),
                        JOB_QUEUE: cf.ref('BatchJobQueue'),
                        JOB_NAME: 'lambda-trigger-job'
                    }
                },
                Runtime: 'nodejs12.x',
                Timeout: '25'
            }
        },
        ScheduledRule: {
            'Type': 'AWS::Events::Rule',
            'Properties': {
                'Description': 'ScheduledRule',
                'ScheduleExpression': 'cron(0 18 ? * FRI *)',
                'State': 'ENABLED',
                'Targets': [{
                    'Arn': cf.getAtt('LambdaTriggerFunction', 'Arn'),
                    'Id': 'TriggerFunction'
                }]
            }
        },
        'PermissionForEventsToInvokeLambda': {
            'Type': 'AWS::Lambda::Permission',
            'Properties': {
                'FunctionName': cf.ref('LambdaTriggerFunction'),
                'Action': 'lambda:InvokeFunction',
                'Principal': 'events.amazonaws.com',
                'SourceArn': cf.getAtt('ScheduledRule', 'Arn')
            }
        },
        APIELB: {
            Type: 'AWS::ElasticLoadBalancingV2::LoadBalancer',
            Properties: {
                Name: cf.stackName,
                Type: 'application',
                SecurityGroups: [ cf.ref('APIELBSecurityGroup') ],
                Subnets:  [
                    'subnet-de35c1f5',
                    'subnet-e67dc7ea',
                    'subnet-38b72502',
                    'subnet-76ae3713',
                    'subnet-35d87242',
                    'subnet-b978ade0'
                ],
            }

        },
        APIELBSecurityGroup: {
            'Type' : 'AWS::EC2::SecurityGroup',
            'Properties' : {
                GroupDescription: cf.join('-', [cf.stackName, 'elb-sg']),
                SecurityGroupIngress: [{
                    CidrIp: '0.0.0.0/0',
                    IpProtocol: 'tcp',
                    FromPort: 80,
                    ToPort: 80
                },{
                    CidrIp: '0.0.0.0/0',
                    IpProtocol: 'tcp',
                    FromPort: 443,
                    ToPort: 443
                }],
                VpcId: 'vpc-3f2aa15a'
            }
        },
        APIHTTPListener: {
            Type: 'AWS::ElasticLoadBalancingV2::Listener',
            Condition: 'HasNoSSL',
            Properties: {
                DefaultActions: [{
                    Type: 'forward',
                    TargetGroupArn: cf.ref('APITargetGroup')
                }],
                LoadBalancerArn: cf.ref('APIELB'),
                Port: 80,
                Protocol: 'HTTP'
            }
        },
        APITargetGroup: {
            Type: 'AWS::ElasticLoadBalancingV2::TargetGroup',
            Properties: {
                Port: 5000,
                Protocol: 'HTTP',
                TargetType: 'ip',
                VpcId: 'vpc-3f2aa15a',
                Matcher: {
                    HttpCode: '200,202,302,304'
                }
            }
        },
        APIECSCluster: {
            Type: 'AWS::ECS::Cluster',
            Properties: {
                ClusterName: cf.join('-', [cf.stackName, 'cluster'])
            }
        },
        APITaskRole: {
            'Type': 'AWS::IAM::Role',
            'Properties': {
                'AssumeRolePolicyDocument': {
                    'Version': '2012-10-17',
                    'Statement': [{
                        Effect: 'Allow',
                        Principal: {
                            Service: 'ecs-tasks.amazonaws.com'
                        },
                        'Action': 'sts:AssumeRole'
                    }]
                },
                Policies: [{
                    PolicyName: cf.join([cf.stackName, '-api-logging']),
                    PolicyDocument: {
                        'Statement': [{
                            'Effect': 'Allow',
                            'Action': [
                                'logs:CreateLogGroup',
                                'logs:CreateLogStream',
                                'logs:PutLogEvents',
                                'logs:DescribeLogStreams'
                            ],
                            'Resource': [ 'arn:aws:logs:*:*:*' ]
                        }]
                    }
                }],
                'ManagedPolicyArns': [
                    'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy',
                    'arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role',
                    'arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly'
                ],
                'Path': '/service-role/'
            }
        },
        APITaskDefinition: {
            Type: 'AWS::ECS::TaskDefinition',
            Properties: {
                Family: cf.stackName,
                Cpu: 512,
                Memory: 1024,
                NetworkMode: 'awsvpc',
                RequiresCompatibilities: ['FARGATE'],
                Tags: [{
                    Key: 'Name',
                    Value: cf.stackName
                }],
                ExecutionRoleArn: cf.getAtt('APITaskRole', 'Arn'),
                ContainerDefinitions: [{
                    Name: 'app',
                    Image: cf.join([cf.accountId, '.dkr.ecr.', cf.region, '.amazonaws.com/batch:api-', cf.ref('GitSha')]),
                    PortMappings: [{
                        ContainerPort: 5000
                    }],
                    Environment: [{
                        Name: 'ECS_LOG_LEVEL',
                        Value: 'debug'
                    }],
                    LogConfiguration: {
                        LogDriver: 'awslogs',
                        Options: {
                            'awslogs-group': cf.join('-', ['awslogs', cf.stackName]),
                            'awslogs-region': cf.region,
                            'awslogs-stream-prefix': cf.join('-', ['awslogs', cf.stackName]),
                            'awslogs-create-group': true
                        }
                    },
                    Essential: true
                }]
            }
        }
    },
    Conditions: {
        HasSSL: cf.notEquals(cf.ref('SSLCertificateIdentifier'), ''),
        HasNoSSL: cf.equals(cf.ref('SSLCertificateIdentifier'), '')
    },
    Outputs: {
        APIELB: {
            Description: 'API URL',
            Value: cf.getAtt('APIELB', 'DNSName')
        }
    }
}

module.exports = stack;
