'use strict';

const { promisify } = require('util');
const request = promisify(require('request'));

/**
 * @class Level
 */
class Level {
    /**
     * @constructor
     */
    constructor() {
        this.OpenCollective = process.env.OPENCOLLECTIVE_API_KEY;
        this.base = 'https://api.opencollective.com/graphql/v2';
    }

    /**
     * Check the Level of a given user
     *
     * @param {User} user
     */
    async get_user(user) {
        const res = await request({
            url: this.base,
            method: 'POST',
            json: true,
            headers: {
                'Api-Key': this.OpenCollective
            },
            body: {

            }
        });

        console.error(res.body);
    }
}

module.exports = Level;
