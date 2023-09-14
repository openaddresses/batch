<template>
<div class='card'>
    <div class='card-header'>
        <h2 class='card-title'>Users</h2>

        <div class='d-flex ms-auto btn-list'>
            <SearchIcon v-if='!showFilter' @click='showFilter = true' class='cursor-pointer'/>
            <XIcon v-else @click='showFilter = false' class='cursor-pointer'/>

            <RefreshIcon @click='getUsers' class='cursor-pointer'/>
        </div>
    </div>

    <template v-if='showFilter'>
        <div class='card-body row'>
            <div class='col-12'>
                <TablerInput label='Username/Email Filter' v-model='paging.name'/>
            </div>
            <div class='col-4 pt-2'>
                <TablerEnum label='Access' v-model='paging.access' :options='["all", "disabled", "admin", "user"]'/>
            </div>
            <div class='col-4 pt-2'>
                <TablerEnum label='Level' v-model='paging.level' :options='["all", "basic", "backer", "sponsor"]'/>
            </div>
            <div class='col-4 pt-2'>
                <TablerEnum label='Validated' v-model='paging.validated' :options='["all", "validated", "unvalidated"]'/>
            </div>
            <div class='col-6 pt-2'>
                <TablerInput label='Before' type='date' v-model='paging.before'/>
                <TablerToggle label='Before Enabled' v-model='paging.switches.before'/>
            </div>
            <div class='col-6 pt-2'>
                <TablerInput label='After' type='date' v-model='paging.after'/>
                <TablerToggle label='After Enabled' v-model='paging.switches.after'/>
            </div>
        </div>
    </template>

    <TablerLoading v-if='loading' desc='Loading Users'/>
    <TablerNone v-else-if='!list.total' :create='false'/>
    <template v-else>
            <table class="table table-vcenter card-table">
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Attributes</th>
                    </tr>
                </thead>
                <tbody>
                    <template v-for='user in list.users'>
                        <tr @click='user._open = !user._open' class='cursor-pointer'>
                            <td v-text='user.username'></td>
                            <td v-text='user.email'></td>
                            <td>
                                <div class='btn-list'>
                                    <span v-if='user.access === "disabled"' class='badge bg-gray text-white' v-text='user.access'></span>
                                    <span v-if='user.access === "admin"' class='badge bg-red text-white' v-text='user.access'></span>
                                    <span v-else class='badge bg-blue text-white' v-text='user.access'></span>

                                    <span v-if='user.level !== "basic"' class='badge bg-purple text-white' v-text='user.level'></span>

                                    <span v-if='!user.validated' class='badge bg-black text-white'>Unvalidated</span>
                                </div>
                            </td>
                        </tr>
                        <tr v-if='user._open'>
                            <td colspan='3'>
                                <div class='row'>
                                    <div class='col-12 d-flex'>
                                        <h3 class='subheader'>User Settings</h3>
                                        <div class='ms-auto'>
                                            <RefreshIcon @click='getUser(user)' class='cursor-pointer'/>
                                        </div>
                                    </div>
                                   <div class='col-12' >
                                        <TablerEnum
                                            label='Access Level'
                                            @change='patchUser(user)'
                                            v-model='user.access'
                                            :options='["disabled", "admin", "user"]'
                                        />

                                        <TablerToggle label='Email Validated' @change='patchUser(user)' v-model='user.validated'/>
                                        <TablerToggle @change='patchUser(user)' label='Source Upload' v-model='user.flags.upload'/>
                                        <TablerToggle @change='patchUser(user)' label='Source Moderator' v-model='user.flags.moderator'/>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </template>
                </tbody>
            </table>
            <TableFooter :limit='paging.limit' :total='list.total' @page='paging.page = $event'/>
    </template>
</div>
</template>

<script>
import Pager from '../../util/Pager.vue';
import TableFooter from '../../util/TableFooter.vue';
import {
    TablerLoading,
    TablerToggle,
    TablerEnum,
    TablerInput,
    TablerNone,
} from '@tak-ps/vue-tabler';

import {
    RefreshIcon,
    SearchIcon,
    XIcon,
} from 'vue-tabler-icons';

export default {
    name: 'AdminUser',
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
                limit: 100,
                page: 0
            },
            showFilter: false,
            page: 0,
            perpage: 15,
            list: {
                total: 0,
                users: []
            }
        };
    },
    mounted: function() {
        this.getUsers();
    },
    watch:  {
        paging: {
           deep: true,
            handler: async function() {
                await this.getUsers();
            }
        }
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
                url.searchParams.append('limit', this.perpage);
                url.searchParams.append('page', this.page);
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
    },
    components: {
        TableFooter,
        TablerLoading,
        TablerNone,
        TablerToggle,
        TablerEnum,
        TablerInput,
        RefreshIcon,
        SearchIcon,
        XIcon,
        Pager
    }
}
</script>
