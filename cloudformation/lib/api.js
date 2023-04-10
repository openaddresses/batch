import cf from '@mapbox/cloudfriend';

export default {
    Parameters: {
        OpenCollective: {
            Type: 'String',
            Description: 'OpenCollective API Token'
        },
        GithubSecret: {
            Type: 'String',
            Description: 'Github CI Integration Secret'
        },
        CLOUDFLARE_ACCOUNT_ID: {
            Type: 'String',
            Description: 'Account Id for CloudFlare'
        },
        R2_ACCESS_KEY_ID: {
            Type: 'String',
            Description: 'Access Key Id for CloudFlare R2'
        },
        R2_SECRET_ACCESS_KEY: {
            Type: 'String',
            Description: 'Secret Access Key for CloudFlare R2'
        }
    },
    Resources: {
        APILogs: {
            Type: 'AWS::Logs::LogGroup',
            Properties: {
                LogGroupName: cf.stackName,
                RetentionInDays: 7
            }
        },
        APIELB: {
            Type: 'AWS::ElasticLoadBalancingV2::LoadBalancer',
            Properties: {
                Name: cf.stackName,
                Type: 'application',
                SecurityGroups: [cf.ref('APIELBSecurityGroup')],
                Subnets:  [
                    'subnet-de35c1f5',
                    'subnet-e67dc7ea',
                    'subnet-38b72502',
                    'subnet-76ae3713',
                    'subnet-35d87242',
                    'subnet-b978ade0'
                ]
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
            DependsOn: 'APIELB',
            Properties: {
                HealthCheckEnabled: true,
                HealthCheckIntervalSeconds: 30,
                HealthCheckPath: '/api/health',
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
                    PolicyName: cf.join([cf.stackName, '-api-task']),
                    PolicyDocument: {
                        Statement: [{
                            Effect: 'Allow',
                            Action: [
                                'batch:SubmitJob',
                                'batch:Describe*',
                                'batch:ListJobs'
                            ],
                            Resource: '*'
                        },{
                            Effect: 'Allow',
                            Action: [
                                'ses:SendEmail',
                                'ses:SendRawEmail'
                            ],
                            Resource: ['*']
                        },{
                            Effect: 'Allow',
                            Action: [
                                'logs:DescribeLogGroups',
                                'logs:DescribeLogStreams',
                                'logs:FilterLogEvents',
                                'logs:GetLogEvents'
                            ],
                            Resource: cf.join(['arn:aws:logs:', cf.region, ':', cf.accountId, ':log-group:*'])
                        },{
                            Effect: 'Allow',
                            Action: [
                                's3:*'
                            ],
                            Resource: [cf.join(['arn:aws:s3:::', cf.ref('Bucket'), '/*'])]
                        },{
                            Effect: 'Allow',
                            Action: [
                                'secretsmanager:Describe*',
                                'secretsmanager:Get*',
                                'secretsmanager:List*'
                            ],
                            'Resource': '*'
                        },{
                            Effect: 'Allow',
                            Action: [
                                'autoscaling:DescribeAutoScalingGroups',
                                'autoscaling:SetDesiredCapacity'
                            ],
                            'Resource': '*'
                        }]
                    }
                }]
            }
        },
        APIExecRole: {
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
                            'Resource': ['arn:aws:logs:*:*:*']
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
                Cpu: 256,
                Memory: 512,
                NetworkMode: 'awsvpc',
                RequiresCompatibilities: ['FARGATE'],
                Tags: [{
                    Key: 'Name',
                    Value: cf.join('-', [cf.stackName, 'api'])
                }],
                ExecutionRoleArn: cf.getAtt('APIExecRole', 'Arn'),
                TaskRoleArn: cf.getAtt('APITaskRole', 'Arn'),
                ContainerDefinitions: [{
                    Name: 'api',
                    Image: cf.join([cf.accountId, '.dkr.ecr.', cf.region, '.amazonaws.com/batch:api-', cf.ref('GitSha')]),
                    PortMappings: [{
                        ContainerPort: 5000
                    }],
                    Environment: [
                        { Name: 'JOB_DEFINITION', Value: cf.ref('BatchJobDefinition') },
                        { Name: 'T3_QUEUE', Value:  cf.importValue('t3-queue') },
                        { Name: 'T3_PRIORITY_QUEUE', Value:  cf.importValue('t3-priority-queue') },
                        { Name: 'T3_CLUSTER_ASG', Value: cf.importValue('t3-cluster-asg') },
                        { Name: 'MEGA_QUEUE', Value: cf.importValue('mega-queue') },
                        { Name: 'ECS_LOG_LEVEL', Value: 'debug' },
                        { Name: 'MAPBOX_TOKEN', Value: cf.ref('MapboxToken') },
                        { Name: 'OPENCOLLECTIVE_API_KEY', Value: cf.ref('OpenCollective') },
                        { Name: 'POSTGRES', Value: cf.join(['postgresql://openaddresses:', cf.ref('DatabasePassword'), '@', cf.getAtt('DBInstanceVPC', 'Endpoint.Address'), ':5432/openaddresses']) },
                        { Name: 'SharedSecret', Value: cf.sub('{{resolve:secretsmanager:${AWS::StackName}/api/signing-secret:SecretString::AWSCURRENT}}') },
                        { Name: 'GithubSecret', Value: cf.ref('GithubSecret') },
                        { Name: 'Bucket', Value: cf.ref('Bucket') },
                        { Name: 'StackName', Value: cf.stackName },
                        { Name: 'CLOUDFLARE_ACCOUNT_ID', Value: cf.ref('CLOUDFLARE_ACCOUNT_ID') },
                        { Name: 'R2_ACCESS_KEY_ID', Value: cf.ref('R2_ACCESS_KEY_ID') },
                        { Name: 'R2_SECRET_ACCESS_KEY', Value: cf.ref('R2_SECRET_ACCESS_KEY') },
                        { Name: 'AWS_DEFAULT_REGION', Value: cf.region }
                    ],
                    LogConfiguration: {
                        LogDriver: 'awslogs',
                        Options: {
                            'awslogs-group': cf.stackName,
                            'awslogs-region': cf.region,
                            'awslogs-stream-prefix': cf.stackName,
                            'awslogs-create-group': true
                        }
                    },
                    Essential: true
                }]
            }
        },
        APIService: {
            Type: 'AWS::ECS::Service',
            Properties: {
                ServiceName: cf.join('-', [cf.stackName, 'Service']),
                Cluster: cf.ref('APIECSCluster'),
                TaskDefinition: cf.ref('APITaskDefinition'),
                LaunchType: 'FARGATE',
                HealthCheckGracePeriodSeconds: 300,
                DesiredCount: 1,
                NetworkConfiguration: {
                    AwsvpcConfiguration: {
                        AssignPublicIp: 'ENABLED',
                        SecurityGroups: [cf.ref('APIServiceSecurityGroup')],
                        Subnets:  [
                            'subnet-de35c1f5',
                            'subnet-e67dc7ea',
                            'subnet-38b72502',
                            'subnet-76ae3713',
                            'subnet-35d87242',
                            'subnet-b978ade0'
                        ]
                    }
                },
                LoadBalancers: [{
                    ContainerName: 'api',
                    ContainerPort: 5000,
                    TargetGroupArn: cf.ref('APITargetGroup')
                }]
            }
        },
        APIServiceSecurityGroup: {
            'Type' : 'AWS::EC2::SecurityGroup',
            'Properties' : {
                GroupDescription: cf.join('-', [cf.stackName, 'ec2-sg']),
                VpcId: 'vpc-3f2aa15a',
                SecurityGroupIngress: [{
                    CidrIp: '0.0.0.0/0',
                    IpProtocol: 'tcp',
                    FromPort: 5000,
                    ToPort: 5000
                }]
            }
        }
    },
    Outputs: {
        APIELB: {
            Description: 'API URL',
            Value: cf.join(['http://', cf.getAtt('APIELB', 'DNSName')])
        },
        SharedSecret: {
            Description: 'SharedSecret',
            Value: cf.sub('{{resolve:secretsmanager:${AWS::StackName}/api/signing-secret:SecretString::AWSCURRENT}}')
        }
    }
};
