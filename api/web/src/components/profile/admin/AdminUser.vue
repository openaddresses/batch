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
            <table class="table table-hover table-vcenter card-table">
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Attributes</th>
                    </tr>
                </thead>
                <tbody>
                    <tr :key='user.id' v-for='user in list.users' class='cursor-pointer'>
                        <td v-text='user.username'></td>
                        <td v-text='user.email'></td>
                        <td>
                            <span v-if='user.access === "disabled"' class='mx3 fr bg-red-faint color-red round inline-block px6 py3 txt-xs txt-bold' v-text='user.access'></span>
                            <span v-else class='mx3 fr bg-blue-faint color-blue round inline-block px6 py3 txt-xs txt-bold' v-text='user.access'></span>

                            <span v-if='user.level !== "basic"' class='mx3 fr bg-purple-faint color-purple round inline-block px6 py3 txt-xs txt-bold' v-text='user.level'></span>

                            <span v-if='!user.validated' class='mx3 fr bg-purple-faint color-gray round inline-block px6 py3 txt-xs txt-bold'>Unvalidated</span>
                        </td>
                    </tr>
                </tbody>
            </table>
            <TableFooter :limit='paging.limit' :total='list.total' @page='paging.page = $event'/>


            <!--

            <div v-if='user._open' class='col col-12 border border--gray-light round px12 py12 my6 grid'>
                <template v-if='user._loading'>
                    <div class='flex flex--center-main w-full py24'>
                        <div class='loading'></div>
                    </div>
                </template>
                <template v-else>
                    <div class='col col--12'>
                        <h3 class='pb6 fl'>User Access</h3>

                        <button @click='getUser(user)' class='btn btn--stroke round color-gray color-blue-on-hover fr'>
                            <svg class='icon'><use xlink:href='#icon-refresh'/></svg>
                        </button>

                        <label class='fr switch-container mr6'>
                            Validated
                            <input @change='patchUser(user)' v-model='user.validated' type='checkbox'/>
                            <div class='switch ml3'></div>
                        </label>
                    </div>

                    <div class='col col--12'>
                        <div class='w-full select-container'>
                            <select @change='patchUser(user)' v-model='user.access' class='select select--stroke'>
                                <option>disabled</option>
                                <option>admin</option>
                                <option>user</option>
                            </select>
                            <div class='select-arrow'></div>
                        </div>
                    </div>

                    <h3 class='pb6 w-full'>User Flags</h3>

                    <div class='col col--6'>
                        <label class='checkbox-container'>
                            <input @change='patchUser(user)' v-model='user.flags.upload' type='checkbox' />
                            <div class='checkbox mr6'>
                                <svg class='icon'><use xlink:href='#icon-check' /></svg>
                            </div>
                            Source Upload
                        </label>
                    </div>
                    <div class='col col--6'>
                        <label class='checkbox-container'>
                            <input @change='patchUser(user)' v-model='user.flags.moderator' type='checkbox' />
                            <div class='checkbox mr6'>
                                <svg class='icon'><use xlink:href='#icon-check' /></svg>
                            </div>
                            Source Moderator
                        </label>
                    </div>
                </template>
        </div>
                -->
    </template>
</div>
</template>

<script>
import Pager from '../../util/Pager.vue';
import TableFooter from '../../util/TableFooter.vue';
import {
    TablerLoading,
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
        TablerLoading,
        TablerNone,
        TablerEnum,
        TablerInput,
        RefreshIcon,
        SearchIcon,
        XIcon,
        Pager
    }
}
</script>
