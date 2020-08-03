'use strict';

const request = require('request');

class JobError {
    static async create(api, id, message) {
        return new Promise((resolve, reject) => {
            request({
                url: `${api}/api/job/error`,
                json: true,
                method: 'POST',
                body: {
                    job: id,
                    message: message
                },
                headers: {
                    'shared-secret': process.env.SharedSecret
                }
            }, (err, res) => {
                if (err) return reject(err);

                return resolve(res.body);
            });
        });

    }
}

module.exports = JobError;
