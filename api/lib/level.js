'use strict';

const { promisify } = require('util');
const request = promisify(require('request'));
const User = require('./user');

/**
 * @class Level
 */
class Level {
    /**
     * @constructor
     */
    constructor(pool) {
        this.OpenCollective = process.env.OPENCOLLECTIVE_API_KEY;
        this.base = 'https://api.opencollective.com/graphql/v2';
        this.user = new User(pool);
    }

    /**
     * Check the Level of a given user
     *
     * TODO: https://github.com/opencollective/opencollective-api/pull/5561
     *      will allow us to only have to query for a single user instead of a list
     *
     * @param {String} email
     */
    async single(email) {
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
        const usrs = res.body.data.account.members.nodes.filter((node) => {
            return node.account.email !== email;
        });

        if (!usrs.length) return;

        if (!['BACKER', 'SPONSOR'].includes(usrs[0].role)) return;
        await this.user.level(usrs[0].account.email, usrs[0].role.toLowerCase());
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

        for (const node of res.body.data.account.members.nodes) {
            if (!['BACKER', 'SPONSOR'].includes(node.role)) continue;
            await this.user.level(node.account.email, node.role.toLowerCase());
        }
    }
}


module.exports = Level;
