'use strict';

const cf = require('@mapbox/cloudfriend');

const stack = {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: 'OpenAddresses T3-Small Test',
    Parameters: {
        GitSha: {
            Type: 'String',
            Description: 'Gitsha to Deploy'
        }
    },
    Resources: {
        T3Cluster: {
            Type : 'AWS::ECS::Cluster',
            Properties: {
                ClusterName: cf.join([cf.stackName, '-default']),
                ClusterSettings: [
                    { Name: 'containerInsights', Value: 'enabled' }
                ],
            }
        },
        T3ClusterASG : {
            "Type" : "AWS::AutoScaling::AutoScalingGroup",
            "Properties" : {
                "VPCZoneIdentifier" : { "Ref" : "Subnets" },
                "LaunchConfigurationName" : { "Ref" : "T3ClusterInstances" },
                "MinSize" : 1,
                "MaxSize" : 1,
                "DesiredCapacity" : 1
            },
            "CreationPolicy" : {
                "ResourceSignal" : {
                    "Timeout" : "PT15M"
                }
            },
            "UpdatePolicy": {
                "AutoScalingRollingUpdate": {
                    "MinInstancesInService": "1",
                    "MaxBatchSize": "1",
                    "PauseTime" : "PT15M",
                    "WaitOnResourceSignals": "true"
                }
            }
        },
        "T3ClusterInstances": {
            "Type": "AWS::AutoScaling::LaunchConfiguration",
            "Metadata" : {
                "AWS::CloudFormation::Init" : {
                    "config" : {
                        "commands" : {
                            "01_add_instance_to_cluster" : {
                                "command" : { "Fn::Join": [ "", [ "#!/bin/bash\n", "echo ECS_CLUSTER=", { "Ref": "ECSCluster" }, " >> /etc/ecs/ecs.config" ] ] }
                            }
                        },
                        "files" : {
                            "/etc/cfn/cfn-hup.conf" : {
                                "content" : { "Fn::Join" : ["", [
                                    "[main]\n",
                                    "stack=", { "Ref" : "AWS::StackId" }, "\n",
                                    "region=", { "Ref" : "AWS::Region" }, "\n"
                                ]]},
                                "mode"    : "000400",
                                "owner"   : "root",
                                "group"   : "root"
                            },
                            "/etc/cfn/hooks.d/cfn-auto-reloader.conf" : {
                                "content": { "Fn::Join" : ["", [
                                    "[cfn-auto-reloader-hook]\n",
                                    "triggers=post.update\n",
                                    "path=Resources.ContainerInstances.Metadata.AWS::CloudFormation::Init\n",
                                    "action=/opt/aws/bin/cfn-init -v ",
                                    "         --stack ", { "Ref" : "AWS::StackName" },
                                    "         --resource ContainerInstances ",
                                    "         --region ", { "Ref" : "AWS::Region" }, "\n",
                                    "runas=root\n"
                                ]]}
                            }
                        },
                        "services" : {
                            "sysvinit" : {
                                "cfn-hup" : { "enabled" : "true", "ensureRunning" : "true", "files" : ["/etc/cfn/cfn-hup.conf", "/etc/cfn/hooks.d/cfn-auto-reloader.conf"] }
                            }
                        }
                    }
                }
            },
            "Properties": {
                "ImageId" : 'ami-6df8fe7a',
                "InstanceType"   : 't3.small',
                "SecurityGroups" : [ { "Ref" : "InstanceSecurityGroup" } ],
                "IamInstanceProfile": { "Ref": "EC2InstanceProfile" },
                "UserData"       : { "Fn::Base64" : { "Fn::Join" : ["", [
                    "#!/bin/bash -xe\n",
                    "yum install -y aws-cfn-bootstrap\n",

                    "/opt/aws/bin/cfn-init -v ",
                    "         --stack ", { "Ref" : "AWS::StackName" },
                    "         --resource ContainerInstances ",
                    "         --region ", { "Ref" : "AWS::Region" }, "\n",

                    "/opt/aws/bin/cfn-signal -e $? ",
                    "         --stack ", { "Ref" : "AWS::StackName" },
                    "         --resource ECSAutoScalingGroup ",
                    "         --region ", { "Ref" : "AWS::Region" }, "\n"
                ]]}}
            }
        },
        "InstanceSecurityGroup" : {
            "Type" : "AWS::EC2::SecurityGroup",
            "Properties" : {
                "SecurityGroupIngress" : []
            }
        },
        "ECSServiceRole": {
            "Type": "AWS::IAM::Role",
            "Properties": {
                "AssumeRolePolicyDocument": {
                    "Statement": [
                        {
                            "Effect": "Allow",
                            "Principal": {
                                "Service": [
                                    "ecs.amazonaws.com"
                                ]
                            },
                            "Action": [
                                "sts:AssumeRole"
                            ]
                        }
                    ]
                },
                "Path": "/",
                "Policies": [
                    {
                        "PolicyName": "ecs-service",
                        "PolicyDocument": {
                            "Statement": [
                                {
                                    "Effect": "Allow",
                                    "Action": [
                                        "ec2:AuthorizeSecurityGroupIngress",
                                        "ec2:Describe*",
                                        "elasticloadbalancing:DeregisterInstancesFromLoadBalancer",
                                        "elasticloadbalancing:DeregisterTargets",
                                        "elasticloadbalancing:Describe*",
                                        "elasticloadbalancing:RegisterInstancesWithLoadBalancer",
                                        "elasticloadbalancing:RegisterTargets"
                                    ],
                                    "Resource": "*"
                                }
                            ]
                        }
                    }
                ]
            }
        },
        "AmazonEC2ContainerServiceAutoscaleRole": {
            "Type": "AWS::IAM::Role",
            "Properties": {
                "AssumeRolePolicyDocument": {
                    "Statement": [
                        {
                            "Effect": "Allow",
                            "Principal": {
                                "Service": "application-autoscaling.amazonaws.com"
                            },
                            "Action": "sts:AssumeRole"
                        }
                    ]
                },
                "Path" : "/",
                "Policies" : [
                    {
                        "PolicyName" : "ecsautoscaling",
                        "PolicyDocument" : {
                            "Statement": [
                                {
                                    "Effect": "Allow",
                                    "Action": [
                                        "ecs:DescribeServices",
                                        "ecs:UpdateService"
                                    ],
                                    "Resource": "*"
                                },
                                {
                                    "Effect": "Allow",
                                    "Action": [
                                        "cloudwatch:DescribeAlarms"
                                    ],
                                    "Resource": "*"
                                }
                            ]
                        }
                    }
                ]
            }
        },

        "EC2Role": {
            "Type": "AWS::IAM::Role",
            "Properties": {
                "AssumeRolePolicyDocument": {
                    "Statement": [
                        {
                            "Effect": "Allow",
                            "Principal": {
                                "Service": [
                                    "ec2.amazonaws.com"
                                ]
                            },
                            "Action": [
                                "sts:AssumeRole"
                            ]
                        }
                    ]
                },
                "Path": "/",
                "Policies": [
                    {
                        "PolicyName": "ecs-instance",
                        "PolicyDocument": {
                            "Statement": [
                                {
                                    "Effect": "Allow",
                                    "Action": [
                                        "ecs:CreateCluster",
                                        "ecs:DeregisterContainerInstance",
                                        "ecs:DiscoverPollEndpoint",
                                        "ecs:Poll",
                                        "ecs:RegisterContainerInstance",
                                        "ecs:StartTelemetrySession",
                                        "ecs:Submit*",
                                        "ecr:GetAuthorizationToken",
                                        "ecr:BatchCheckLayerAvailability",
                                        "ecr:GetDownloadUrlForLayer",
                                        "ecr:BatchGetImage",
                                        "logs:CreateLogStream",
                                        "logs:PutLogEvents"
                                    ],
                                    "Resource": "*"
                                }
                            ]
                        }
                    }
                ]
            }
        },
        "ECSTaskRole": {
            "Type": "AWS::IAM::Role",
            "Properties": {
                "AssumeRolePolicyDocument": {
                    "Statement": [
                        {
                            "Effect": "Allow",
                            "Principal": {
                                "Service": [
                                    "ecs-tasks.amazonaws.com"
                                ]
                            },
                            "Action": [
                                "sts:AssumeRole"
                            ]
                        }
                    ]
                },
                "Path": "/",
                "Policies": [
                    {
                        "PolicyName": "ecs-task",
                        "PolicyDocument": {
                            "Statement": [
                                {
                                    "Effect": "Allow",
                                    "Action": [
                                        "s3:GetObject"
                                    ],
                                    "Resource": "*"
                                },
                                {
                                    "Effect": "Allow",
                                    "Action": [
                                        "sqs:ListQueues",
                                        "sqs:GetQueueUrl"
                                    ],
                                    "Resource": "*"
                                },
                                {
                                    "Effect": "Allow",
                                    "Action": [
                                        "sqs:DeleteMessage",
                                        "sqs:ReceiveMessage",
                                        "sqs:ChangeMessageVisibility"
                                    ],
                                    "Resource": { "Fn::GetAtt" : ["SQSBatchQueue", "Arn"] }
                                },
                                {
                                    "Effect": "Allow",
                                    "Action": [
                                        "s3:PutObject"
                                    ],
                                    "Resource":  { "Fn::Join" : ["", ["arn:aws:s3:::", { "Ref" : "myS3OutputBucket" } , "/*" ]]}
                                }
                            ]
                        }
                    }
                ]
            }
        },

        "EC2InstanceProfile": {
            "Type": "AWS::IAM::InstanceProfile",
            "Properties": {
                "Path": "/",
                "Roles": [
                    {
                        "Ref": "EC2Role"
                    }
                ]
            }
        }
    }
};

module.exports = stack;
