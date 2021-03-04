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
     * TODO: https://github.com/opencollective/opencollective-api/pull/5561
     *      will allow us to only have to query for a single user instead of a list
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
                query: `{
                    account(slug: "openaddresses") {
                      members {
                        nodes {
                          id
                          role
                          account {
                            id
                            slug
                            ... on Individual {
                              email
                            }
                         }
                      }
                    }
                  }
                }`
             }
        });
    }

    /**
     * Refresh the entire user list
     */
    async all() {
        const res = await request({
            url: this.base,
            method: 'POST',
            json: true,
            headers: {
                'Api-Key': this.OpenCollective
            },
            body: {
                query: `{
                    account(slug: "openaddresses") {
                      members {
                        nodes {
                          id
                          role
                          account {
                            id
                            slug
                            ... on Individual {
                              email
                            }
                         }
                      }
                    }
                  }
                }`
             }
        });
    }
}


module.exports = Level;
