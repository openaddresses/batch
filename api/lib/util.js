'use strict';

const request = require('request');

function explode(url) {
    return new Promise((resolve, reject) => {
        request({
            url: url,
            method: 'GET',
            json: true
        }, (err, res) => {
            if (err) return reject(err);

            const source = res.body;

            const jobs = [];

            const layers = Object.keys(source.layers);
            for (const layer of layers) {
                for (const j of source.layers[layer]) {
                    jobs.push({
                        source: url,
                        layer: layer,
                        name: j.name
                    });
                }
            }

            return resolve(jobs);
        });
    });
}

module.exports.explode = explode;
