'use strict';

const cf = require('@mapbox/cloudfriend');

const stack = {
    Resources: {
        APISigningSecret: {
            Type: 'AWS::SecretsManager::Secret',
            Properties: {
                Description: cf.join([cf.stackName, ' JWT Signing Secret']),
                GenerateSecretString: {
                    PasswordLength: 32
                },
                Name: cf.join([cf.stackName, '/api/signing-secret']),
                KmsKeyId: cf.ref('OAKMS')
            }
        },

    }
};

module.exports = stack;
