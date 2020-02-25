const cf = require('@mapbox/cloudfriend');
const api = require('./api.js');
const batch = require('./batch.js');

const stack = {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: 'OpenAddresses Batch Processing',
    Parameters: {
        GitSha: {
            Type: 'String',
            Description: 'Gitsha to Deploy'
        }
    }
}

module.exports = cf.merge(
    stack,
    api,
    batch
);
