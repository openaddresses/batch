const cf = require('@mapbox/cloudfriend');

const stack = {
    "AWSTemplateFormatVersion": "2010-09-09",
    "Description": "aws-batch-example",
    "Parameters": {
        "GitSha": {
            "Type": "String",
            "Description": "Gitsha to Deploy"
        }
    },
    "Resources": {
        "IAM": {
            "Type": "AWS::IAM::Role",
            "Properties": {
                "AssumeRolePolicyDocument": {
                    "Version": "2012-10-17",
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
                        "PolicyName": "root",
                        "PolicyDocument": {
                            "Version": "2012-10-17",
                            "Statement": [
                                {
                                    "Effect": "Allow",
                                    "Action": [
                                        "ecr:BatchCheckLayerAvailability",
                                        "ecr:BatchGetImage",
                                        "ecr:GetDownloadUrlForLayer",
                                        "ecr:GetAuthorizationToken",
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
                ],
                "RoleName": cf.join("-", [cf.ref('AWS::StackName'), 'role'])
            }
        },
        "SecurityGroup": {
            "Type": "AWS::EC2::SecurityGroup",
            "Properties": {
                "GroupName": cf.join("-", [cf.ref('AWS::StackName'), 'sg']),
                "GroupDescription": "Security Group for aws-batch-example",
                "Tags": [
                    {
                        "Key": "Name",
                        "Value": "aws-batch-example"
                    },
                    {
                        "Key": "Project",
                        "Value": "aws-batch-example"
                    }
                ],
                "VpcId": "", // vpcId
                "SecurityGroupEgress": {
                    "CidrIp": "0.0.0.0/0",
                    "IpProtocol": -1
                },
                "SecurityGroupIngress": [
                    {
                        "CidrIp": "0.0.0.0/0",
                        "IpProtocol": "tcp",
                        "FromPort": 80,
                        "ToPort": 80
                    },
                    {
                        "CidrIp": "0.0.0.0/0",
                        "IpProtocol": "tcp",
                        "FromPort": 443,
                        "ToPort": 443
                    },
                    {
                        "CidrIp": "0.0.0.0/0",
                        "IpProtocol": "tcp",
                        "FromPort": 22,
                        "ToPort": 22
                    },
                    {
                        "CidrIp": "0.0.0.0/0",
                        "IpProtocol": "tcp",
                        "FromPort": 5432,
                        "ToPort": 5432
                    },
                    {
                        "CidrIp": "0.0.0.0/0",
                        "IpProtocol": "tcp",
                        "FromPort": 8000,
                        "ToPort": 8000
                    }
                ]
            }
        },
        "AWSBatchServiceRole": {
            "Type": "AWS::IAM::Role",
            "Properties": {
                "AssumeRolePolicyDocument": {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Effect": "Allow",
                            "Principal": {
                                "Service": "batch.amazonaws.com"
                            },
                            "Action": "sts:AssumeRole"
                        }
                    ]
                },
                "ManagedPolicyArns": [
                    "arn:aws:iam::aws:policy/service-role/AWSBatchServiceRole"
                ],
                "Path": "/service-role/"
            }
        },
        "AmazonEC2SpotFleetRole": {
            "Type": "AWS::IAM::Role",
            "Properties": {
                "AssumeRolePolicyDocument": {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Effect": "Allow",
                            "Principal": {
                                "Service": "spotfleet.amazonaws.com"
                            },
                            "Action": "sts:AssumeRole"
                        }
                    ]
                },
                "ManagedPolicyArns": [
                    "arn:aws:iam::aws:policy/service-role/AmazonEC2SpotFleetRole"
                ],
                "Path": "/"
            }
        },
        "BatchInstanceRole": {
            "Type": "AWS::IAM::Role",
            "Properties": {
                "AssumeRolePolicyDocument": {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Effect": "Allow",
                            "Principal": {
                                "Service": "ec2.amazonaws.com"
                            },
                            "Action": "sts:AssumeRole"
                        }
                    ]
                },
                "ManagedPolicyArns": [
                    "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
                ],
                "Path": "/"
            }
        },
        "BatchInstanceProfile": {
            "Type": "AWS::IAM::InstanceProfile",
            "Properties": {
                "Roles": [ cf.ref('BatchInstanceRole') ],
                "Path": "/"
            }
        },
        "BatchJobRole": {
            "Type": "AWS::IAM::Role",
            "Properties": {
                "AssumeRolePolicyDocument": {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Effect": "Allow",
                            "Principal": {
                                "Service": "ecs-tasks.amazonaws.com"
                            },
                            "Action": "sts:AssumeRole"
                        }
                    ]
                },
                "Policies": [
                    {
                        "PolicyName": "batch-job-policy",
                        "PolicyDocument": {
                            "Statement": [
                                {
                                    "Effect": "Allow",
                                    "Action": [
                                        "s3:GetObject"
                                    ],
                                    "Resource": [
                                        "arn:aws:s3:::data.openaddresses.io/*"
                                    ]
                                }
                            ]
                        }
                    }
                ],
                "Path": "/"
            }
        },
        "BatchComputeEnvironment": {
            "Type" : "AWS::Batch::ComputeEnvironment",
            "Properties" : {
                "Type" : "MANAGED",
                "ServiceRole" : cf.getAtt('AWSBatchServiceRole', 'Arn'),
                "ComputeEnvironmentName" : "CEExample",
                "ComputeResources" : {
                    "SpotIamFleetRole": cf.getAtt('AmazonEC2SpotFleetRole', 'Arn'),
                    "ImageId": "ami-28456852",
                    "MaxvCpus" : 128,
                    "DesiredvCpus" : 4,
                    "MinvCpus" : 4,
                    "BidPercentage" : 50,
                    "SecurityGroupIds" : [ cf.getAtt('SecurityGroup', 'GroupId') ],
                    "Subnets" :  [
                        // subnets
                    ],
                    "Type" : "SPOT",
                    "InstanceRole" : cf.getAtt('BatchInstanceProfile', 'Arn'),
                    "InstanceTypes" : [
                        "c4.large",
                        "c4.xlarge"
                    ],
                    "Tags" : {
                        "Name": "CEExample"
                    }
                },
                "State" : "ENABLED"
            }
        },
        "BatchJobDefinition": {
            "Type": "AWS::Batch::JobDefinition",
            "Properties": {
                "Type": "container",
                "JobDefinitionName": "machine",
                "RetryStrategy": {
                    "Attempts": 1
                },
                "Parameters": { },
                "ContainerProperties": {
                    "Command": [
                        "./task.sh",
                    ],
                    "Memory": 4000,
                    "Privileged": true,
                    "JobRoleArn": cf.getAtt('BatchJobRole', 'Arn'),
                    "ReadonlyRootFilesystem": false,
                    "Vcpus": 2,
                    "Image": cf.join(['batch', cf.ref('GitSha')])
                }
            }
        },
        "BatchJobQueue": {
            "Type": "AWS::Batch::JobQueue",
            "Properties": {
                "ComputeEnvironmentOrder": [{
                    "Order": 1,
                    "ComputeEnvironment": cf.ref('BatchComputeEnvironment')
                }],
                "State": "ENABLED",
                "Priority": 1,
                "JobQueueName": "HighPriority"
            }
        },
        "LambdaExecutionRole": {
            "Type": "AWS::IAM::Role",
            "Properties": {
                "AssumeRolePolicyDocument": {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Effect": "Allow",
                            "Principal":{
                                "Service": [
                                    "lambda.amazonaws.com"
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
                        "PolicyName": "lambda-batch",
                        "PolicyDocument": {
                            "Statement": [
                                {
                                    "Effect": "Allow",
                                    "Action": [
                                        "batch:SubmitJob"
                                    ],
                                    "Resource": "arn:aws:batch:*:*:*"
                                }
                            ]
                        }
                    },
                    {
                        "PolicyName": "lambda-logs",
                        "PolicyDocument": {
                            "Version": "2012-10-17",
                            "Statement": [{
                                "Effect": "Allow",
                                "Action": [ "logs:*" ],
                                "Resource": "arn:aws:logs:*:*:*"
                            }]
                        }
                    },
                    {
                        "PolicyName": "lambda-s3",
                        "PolicyDocument": {
                            "Statement": [{
                                "Effect": "Allow",
                                "Action": [ "s3:GetObject" ],
                                "Resource": [ 'arn:aws:s3:::openaddresses-lambdas/*' ]
                            }]
                        }
                    }
                ]
            }
        },
        "LambdaTriggerFunction": {
            "Type": "AWS::Lambda::Function",
            "Properties": {
                "Handler": "index.trigger",
                "Role": cf.getAtt('LambdaExecutionRole', 'Arn'),
                "Code": {
                    "S3Bucket": 'openaddresses-lambdas',
                    "S3Key": cf.join(['batch/', cf.ref('GitSha'), '.zip' ])
                },
                "Environment": {
                    "Variables": {
                        "JOB_DEFINITION": {
                            "Ref": "BatchJobDefinition"
                        },
                        "JOB_QUEUE": {
                            "Ref": "BatchJobQueue"
                        },
                        "JOB_NAME": "lambda-trigger-job"
                    }
                },
                "Runtime": "nodejs12.x",
                "Timeout": "25"
            }
        },
        "ScheduledRule": {
            "Type": "AWS::Events::Rule",
            "Properties": {
                "Description": "ScheduledRule",
                "ScheduleExpression": "rate(10 minutes)",
                "State": "ENABLED",
                "Targets": [{
                    "Arn": cf.getAtt('LambdaTriggerFunction', 'Arn'),
                    "Id": "TriggerFunction"
                }]
            }
        },
        "PermissionForEventsToInvokeLambda": {
            "Type": "AWS::Lambda::Permission",
            "Properties": {
                "FunctionName": { "Ref": "LambdaTriggerFunction" },
                "Action": "lambda:InvokeFunction",
                "Principal": "events.amazonaws.com",
                "SourceArn": cf.getAtt('ScheduledRule', 'Arn')
            }
        }
    }
}

module.exports = stack;
