'use strict';

const cf = require('@mapbox/cloudfriend');

const stack = {
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
                            AWS: cf.join(['arn:aws:iam::', cf.accountId, ':root']),
                        },
                        Action: ['kms:*'],
                        Resource: '*'
                    }]
                }
            }
        }
    }
};

module.exports = stack;
