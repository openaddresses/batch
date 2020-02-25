const cf = require('@mapbox/cloudfriend');

const stack = {
    Parameters: {
        DatabaseType: {
            Type: 'String',
            Default: 'db.t3.micro',
            Description: 'Database size to create',
            AllowedValues: [
                'db.t3.micro'
            ]
        },
        DatabasePassword: {
            Type: 'String',
            Description: '[secure] Database Password'
        }
    },
    Resources: {
        DBInstance: {
            Type: 'AWS::RDS::DBInstance',
            Properties: {
                Engine: 'postgres',
                DBName: 'openaddresses',
                EngineVersion: '11.2',
                MasterUsername: 'openaddresses',
                MasterUserPassword: cf.ref('DatabasePassword'),
                AllocatedStorage: 10,
                MaxAllocatedStorage: 100,
                BackupRetentionPeriod: 10,
                StorageType: 'gp2',
                DBInstanceClass: cf.ref('DatabaseType'),
                DBSecurityGroups: [ cf.ref('DBSecurityGroup') ],
                DBSubnetGroupName: cf.ref('DBSubnet')
            }
        },
        DBSubnet: {
            'Type' : 'AWS::RDS::DBSubnetGroup',
            'Properties' : {
                'DBSubnetGroupDescription': cf.join('-', [cf.stackName, 'rds-subnets']),
                'SubnetIds': [
                    'subnet-de35c1f5',
                    'subnet-e67dc7ea',
                    'subnet-38b72502',
                    'subnet-76ae3713',
                    'subnet-35d87242',
                    'subnet-b978ade0'
                ]
            }
        },
        'DBSecurityGroup': {
            Type : 'AWS::RDS::DBSecurityGroup',
            Properties : {
                GroupDescription: cf.join('-', [cf.stackName, 'rds-sg']),
                EC2VpcId: 'vpc-3f2aa15a',
                DBSecurityGroupIngress: {
                    EC2SecurityGroupId: cf.getAtt('APIServiceSecurityGroup', 'GroupId')
                }
            }
        }

    }
}

module.exports = stack;
