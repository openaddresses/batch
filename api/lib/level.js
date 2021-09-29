const { promisify } = require('util');
const pkg = require('../package.json');
const request = promisify(require('request'));
const moment = require('moment');
const User = require('./user');
const Override = require('./level-override');

/**
 * @class Level
 */
class Level {
    /**
     * @constructor
     *
     * @param {Pool} pool PG Pool Instance
     */
    constructor(pool) {
        this.OpenCollective = process.env.OPENCOLLECTIVE_API_KEY;
        this.base = 'https://api.opencollective.com/graphql/v2';
        this.user = new User(pool);
        this.pool = pool;
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
        for (const override of (await Override.list(this.pool)).level_override) {
            if (email.match(override.pattern)) {
                return await this.user.level(email, override.level);
            }
        }

        const res = await request({
            url: this.base,
            method: 'POST',
            json: true,
            headers: {
                'Api-Key': this.OpenCollective,
                'User-Agent': `OpenAddresses v${pkg.version}`
            },
            body: {
                query: `
                  query account($slug: String, $email: EmailAddress, $roles: [MemberRole]) {
                    account(slug: $slug) {
                      members(email: $email, role: $roles) {
                        nodes {
                          id
                          role
                          account {
                            id
                            slug
                            transactions (limit:1, orderBy: {
                              field:CREATED_AT,
                              direction: DESC

                            }) {
                              nodes {
                                createdAt
                                netAmount {
                                  value
                                  currency
                              }
                            }
                          }
                          ... on Individual {
                            email
                          }
                        }
                      }
                    }
                  }
                }`,
                variables: {
                    slug: 'openaddresses',
                    email: email,
                    roles: ['BACKER']
                }
            }
        });

        const usrs = res.body.data.account.members.nodes.filter((node) => {
            return node.account.email === email;
        });

        if (!usrs.length) return;

        // No user exists on OC
        const account = usrs[0].account;

        // The user has never made a transaction
        if (!account.transactions.nodes.length) return;
        if (!account.email) return;

        const level = Level.calc(account.transactions.nodes[0]);
        await this.user.level(account.email, level);
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
                'Api-Key': this.OpenCollective,
                'User-Agent': `OpenAddresses v${pkg.version}`
            },
            body: {
                query: `{
                  query account($slug: String, $roles: [MemberRole]) {
                    account(slug: $slug) {
                      members(role: $roles) {
                        nodes {
                          id
                          role
                          account {
                            id
                            slug
                            ... on Individual {
                              email
                            }
                            transactions (limit:1, orderBy: {
                              field:CREATED_AT,
                              direction: DESC

                            }) {
                              nodes {
                                createdAt
                                netAmount {
                                  value
                                  currency
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }`,
                variables: {
                    slug: 'openaddresses',
                    roles: ['BACKER']
                }
            }
        });

        const usrs = res.body.data.account.members.nodes;
        if (!usrs.length) return;

        for (const usr of usrs) {
            // The user has never made a transaction
            if (!usr.account.transactions.nodes.length) return;
            if (!usr.account.email) return;

            for (const override of (await Override.list(this.pool)).level_override) {
                if (usr.account.email.match(override.pattern)) {
                    return await this.user.level(usr.account.email, override.level);
                }
            }

            const level = Level.calc(usr.account.transactions.nodes[0]);
            await this.user.level(usr.account.email, level);
        }
    }

    /**
     * Calculate the level given an OpenCollective transaction
     *
     * @param {Object}  transaction
     * @param {Date}    transaction.createdAt
     * @param {Object}  transaction.netAmount
     * @param {Number}  transaction.netAmount.value
     * @param {String}  transaction.netAmount.currency
     *
     * @returns {String} Level basic/backer/sponsor
     */
    static calc(transaction) {
        const created = moment(transaction.createdAt).add(1, 'month');

        if (created < moment()) {
            return 'basic';
        } else if (transaction.netAmount.value <= -100) {
            return 'sponsor';
        } else if (transaction.netAmount.value <= -5) {
            return 'backer';
        }

        return 'basic';
    }
}


module.exports = Level;
