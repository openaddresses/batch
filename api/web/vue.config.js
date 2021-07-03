const Assembly = require('@mapbox/assembly');

module.exports = {
    chainWebpack: () => {
        Assembly.buildUserAssets('public/')
    },
    pages: {
        index: {
            entry: 'src/pages/main.js',
            template: 'public/index.html',
            filename: 'index.html',
            title: 'OpenAddresses',
        },
        map: {
            entry: 'src/pages/map/main.js',
            template: 'public/index.html',
            filename: 'map.html',
            title: 'OpenAddresses Fabric',
        },
        'location/*': {
            entry: 'src/pages/location/main.js',
            template: 'public/index.html',
            filename: 'location.html',
            title: 'OpenAddresses Location',
        }
    }
};
