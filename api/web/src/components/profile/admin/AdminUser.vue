<template>
    <div class='card'>
        <div class='card-header'>
            <h2 class='card-title'>
                Users
            </h2>

            <div class='d-flex ms-auto btn-list'>
                <IconSearch
                    v-if='!showFilter'
                    class='cursor-pointer'
                    size='32'
                    @click='showFilter = true'
                />
                <IconX
                    v-else
                    class='cursor-pointer'
                    size='32'
                    @click='showFilter = false'
                />

                <IconRefresh
                    class='cursor-pointer'
                    size='32'
                    @click='getUsers'
                />
            </div>
        </div>

        <template v-if='showFilter'>
            <div class='card-body row'>
                <div class='col-12'>
                    <TablerInput
                        v-model='paging.name'
                        label='Username/Email Filter'
                    />
                </div>
                <div class='col-4 pt-2'>
                    <TablerEnum
                        v-model='paging.access'
                        label='Access'
                        :options='["all", "disabled", "admin", "user"]'
                    />
                </div>
                <div class='col-4 pt-2'>
                    <TablerEnum
                        v-model='paging.level'
                        label='Level'
                        :options='["all", "basic", "backer", "sponsor"]'
                    />
                </div>
                <div class='col-4 pt-2'>
                    <TablerEnum
                        v-model='paging.validated'
                        label='Validated'
                        :options='["all", "validated", "unvalidated"]'
                    />
                </div>
                <div class='col-6 pt-2'>
                    <TablerInput
                        v-model='paging.before'
                        label='Before'
                        type='date'
                    />
                    <TablerToggle
                        v-model='paging.switches.before'
                        label='Before Enabled'
                    />
                </div>
                <div class='col-6 pt-2'>
                    <TablerInput
                        v-model='paging.after'
                        label='After'
                        type='date'
                    />
                    <TablerToggle
                        v-model='paging.switches.after'
                        label='After Enabled'
                    />
                </div>
            </div>
        </template>

        <TablerLoading
            v-if='loading'
            desc='Loading Users'
        />
        <TablerNone
            v-else-if='!list.total'
            :create='false'
        />
        <template v-else>
            <table class='table table-vcenter card-table'>
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Attributes</th>
                    </tr>
                </thead>
                <tbody>
                    <template v-for='user in list.users'>
                        <tr
                            class='cursor-pointer'
                            @click='user._open = !user._open'
                        >
                            <td v-text='user.username' />
                            <td v-text='user.email' />
                            <td>
                                <div class='btn-list'>
                                    <span
                                        v-if='user.access === "disabled"'
                                        class='badge bg-gray text-white'
                                        v-text='user.access'
                                    />
                                    <span
                                        v-if='user.access === "admin"'
                                        class='badge bg-red text-white'
                                        v-text='user.access'
                                    />
                                    <span
                                        v-else
                                        class='badge bg-blue text-white'
                                        v-text='user.access'
                                    />

                                    <span
                                        v-if='user.level !== "basic"'
                                        class='badge bg-purple text-white'
                                        v-text='user.level'
                                    />

                                    <span
                                        v-if='!user.validated'
                                        class='badge bg-black text-white'
                                    >Unvalidated</span>
                                </div>
                            </td>
                        </tr>
                        <tr v-if='user._open'>
                            <td colspan='3'>
                                <div class='row'>
                                    <div class='col-12 d-flex'>
                                        <h3 class='subheader'>
                                            User Settings
                                        </h3>
                                        <div class='ms-auto'>
                                            <IconRefresh
                                                class='cursor-pointer'
                                                size='32'
                                                @click='getUser(user)'
                                            />
                                        </div>
                                    </div>
                                    <div class='col-12'>
                                        <TablerEnum
                                            v-model='user.access'
                                            label='Access Level'
                                            :options='["disabled", "admin", "user"]'
                                            @change='patchUser(user)'
                                        />

                                        <TablerToggle
                                            v-model='user.validated'
                                            label='Email Validated'
                                            @change='patchUser(user)'
                                        />
                                        <TablerToggle
                                            v-model='user.flags.upload'
                                            label='Source Upload'
                                            @change='patchUser(user)'
                                        />
                                        <TablerToggle
                                            v-model='user.flags.moderator'
                                            label='Source Moderator'
                                            @change='patchUser(user)'
                                        />
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </template>
                </tbody>
            </table>

            <TableFooter
                :limit='paging.limit'
                :total='list.total'
                @page='paging.page = $event'
            />
        </template>
    </div>
</template>

<script>
import TableFooter from '../../util/TableFooter.vue';
import {
    TablerLoading,
    TablerToggle,
    TablerEnum,
    TablerInput,
    TablerNone,
} from '@tak-ps/vue-tabler';

import {
    IconRefresh,
    IconSearch,
    IconX,
} from '@tabler/icons-vue';

export default {
    name: 'AdminUser',
    components: {
        TableFooter,
        TablerLoading,
        TablerNone,
        TablerToggle,
        TablerEnum,
        TablerInput,
        IconRefresh,
        IconSearch,
        IconX,
    },
    props: [ ],
    data: function() {
        return {
            loading: false,
            paging: {
                name: '',
                level: 'all',
                access: 'all',
                validated: 'all',
                before: '',
                after: '',
                switches: {
                    before: false,
                    after: false
                },
                sort: 'id',
                order: 'desc',
                limit: 20,
                page: 0
            },
            showFilter: false,
            list: {
                total: 0,
                users: []
            }
        };
    },
    watch:  {
        paging: {
           deep: true,
            handler: async function() {
                await this.getUsers();
            }
        }
    },
    mounted: function() {
        this.getUsers();
    },
    methods: {
        getUser: async function(user) {
            try {
                user._loading = true;

                const url = new URL(`${window.location.origin}/api/user/${user.id}`);
                url.searchParams.append('level', 'true')

                const res = await window.std(url);

                Object.assign(user, res);

                user._loading = false;
            } catch (err) {
                this.$emit('err', err);
            }
        },
        getUsers: async function() {
            try {
                const url = new URL(`${window.location.origin}/api/user`);
                url.searchParams.append('limit', this.paging.limit);
                url.searchParams.append('page', this.paging.page);
                url.searchParams.append('filter', this.paging.name);

                if (this.paging.level !== 'all') url.searchParams.append('level', this.paging.level);
                if (this.paging.access !== 'all') url.searchParams.append('access', this.paging.access);

                if (this.paging.validated === 'unvalidated') url.searchParams.append('validated', 'false');
                if (this.paging.validated === 'validated') url.searchParams.append('validated', 'true');

                if (this.paging.switches.after && this.paging.after) url.searchParams.set('after', this.paging.after);
                if (this.paging.switches.before && this.paging.before) url.searchParams.set('before', this.paging.before);

                const res = await window.std(url);
                res.users = res.users.map((user) => {
                    user._open = false;
                    return user;
                });
                this.list = res;

                this.loading = false;
            } catch (err) {
                this.$emit('err', err);
            }
        },
        patchUser: async function(user) {
            try {
                const res = await window.std(`/api/user/${user.id}`, {
                    method: 'PATCH',
                    body: {
                        access: user.access,
                        flags: user.flags,
                        validated: user.validated
                    }
                });

                for (const key of Object.keys(res)) {
                    user[key] = res[key];
                }
            } catch (err) {
                this.$emit('err', err);
            }
        }
    }
}
</script>
