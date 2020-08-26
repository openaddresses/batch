const Assembly = require('@mapbox/assembly');

module.exports = {
    chainWebpack: () => {
        Assembly.buildUserAssets('public/')
    }
};
