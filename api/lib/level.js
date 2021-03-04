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
     * @param {String} email
     */
    async get_user(user, email) {
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

        // TODO this will eventually be removed
        const users = res.body.data.account.members.nodes.filter((node) => {
            return node.account.email === email;
        });

        console.error(users)
    }

    /**
     * Refresh the entire user list
     *
     * @param {User} user
     */
    async all(user) {
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

        for (const node of res.body.data.account.members.nodes) {
            if (!['BACKER', 'SPONSOR'].includes(node.role)) continue;
            await user.level(node.account.email, node.role.toLowerCase());
        }
    }
}


module.exports = Level;
