const Assembly = require('@mapbox/assembly');

module.exports = {
    chainWebpack: config => {
        Assembly.buildUserAssets('public/')
    }
};
