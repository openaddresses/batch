import cf from '@openaddresses/cloudfriend';

export default {
    Resources: {
        OAKMS: {
            Type : 'AWS::KMS::Key',
            Properties: {
                Description: cf.stackName,
                Enabled: true,
                EnableKeyRotation: false,
                KeyPolicy: {
                    Id: cf.stackName,
                    Statement: [{
                        Effect: 'Allow',
                        Principal: {
                            AWS: cf.join(['arn:aws:iam::', cf.accountId, ':root'])
                        },
                        Action: ['kms:*'],
                        Resource: '*'
                    }]
                }
            }
        }
    }
};
