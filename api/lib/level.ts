import { fetch } from 'undici';
import Err from '@openaddresses/batch-error';
import moment from 'moment';
import User from './user.js';
import LevelOverrideModel from './models/LevelOverride.js';
import fs from 'fs';
import type { Pool } from '@openaddresses/batch-generic';
import type * as pgschema from './schema.js';

const pkg: { version: string } = JSON.parse(String(fs.readFileSync(new URL('../package.json', import.meta.url))));

interface OCTransaction {
    createdAt: string;
    netAmount: { value: number; currency: string };
}

interface OCAccount {
    id: string;
    slug?: string;
    email?: string;
    transactions: { nodes: OCTransaction[] };
}

interface OCMemberNode {
    id: string;
    role: string;
    account: OCAccount | null;
    email?: string;
}

interface OCResponse {
    data?: { account?: { members: { nodes: OCMemberNode[] } } };
    errors?: unknown;
}

/**
 * @class
 */
export default class Level {
    OpenCollective?: string;
    base: string;
    user: User;
    override: LevelOverrideModel;
    pool: Pool<typeof pgschema>;

    constructor(pool: Pool<typeof pgschema>) {
        this.OpenCollective = process.env.OPENCOLLECTIVE_API_KEY;
        this.base = 'https://api.opencollective.com/graphql/v2';
        this.user = new User(pool);
        this.override = new LevelOverrideModel(pool);
        this.pool = pool;
    }

    /**
     * Check the Level of a given user
     */
    async single(email: string): Promise<boolean | void> {
        for (const override of (await this.override.list()).items) {
            if (email.match(override.pattern)) {
                return await this.user.level(email, override.level);
            }
        }

        const res = await fetch(this.base, {
            method: 'POST',
            headers: {
                'Api-Key': String(this.OpenCollective),
                'User-Agent': `OpenAddresses v${pkg.version}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
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
                    roles: ['BACKER'],
                },
            }),
        });

        const body = await res.json() as OCResponse;

        if (!res.ok || !body.data || !body.data.account) {
            throw new Err(500, new Error(JSON.stringify(body.errors || body)), 'OpenCollective API Error');
        }

        const usrs = body.data.account.members.nodes.filter((node) => {
            return node.account && node.account.email === email;
        });

        if (!usrs.length) return;

        // No user exists on OC
        const account = usrs[0].account;
        if (!account) return;

        // The user has never made a transaction
        if (!account.transactions.nodes.length) return;
        if (!account.email) return;

        const level = Level.calc(account.transactions.nodes[0]);
        await this.user.level(account.email, level);
    }

    /**
     * Refresh the entire user list
     */
    async all(): Promise<boolean | void> {
        const res = await fetch(this.base, {
            method: 'POST',
            headers: {
                'Api-Key': String(this.OpenCollective),
                'User-Agent': `OpenAddresses v${pkg.version}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: `
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
                    roles: ['BACKER'],
                },
            }),
        });

        const body = await res.json() as OCResponse;
        const usrs = body.data?.account?.members.nodes ?? [];
        if (!usrs.length) return;

        for (const usr of usrs) {
            // Skip nodes where account is null (OC can return null accounts for deleted users)
            if (!usr.account) continue;
            // The user has never made a transaction
            if (!usr.account.transactions.nodes.length) continue;
            if (!usr.account.email) continue;

            for (const override of (await this.override.list()).items) {
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
     * @returns Level basic/backer/sponsor
     */
    static calc(transaction: OCTransaction): string {
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
