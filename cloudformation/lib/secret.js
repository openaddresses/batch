import cf from '@mapbox/cloudfriend';

export default {
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
        }

    }
};
