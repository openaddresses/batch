<template>
    <div class='col col--12 grid pt24'>
        <div class='col col--12 grid border-b border--gray-light pt24'>
            <div class='col col--12'>
                <h2 class='txt-h4 ml12 pb12 fl'>
                    <span class='bg-red-faint color-red round inline-block px6 py3 txt-xs txt-bold'>Admin</span>
                    Users:
                </h2>

                <div class='fr'>
                    <button @click='showFilter = !showFilter' class='btn round btn--stroke color-gray mr12'>
                        <svg v-if='!showFilter' class='icon'><use href='#icon-search'/></svg>
                        <svg v-else class='icon'><use href='#icon-close'/></svg>
                    </button>

                    <button @click='refresh' class='btn round btn--stroke color-gray'>
                        <svg class='icon'><use xlink:href='#icon-refresh'/></svg>
                    </button>
                </div>
            </div>
        </div>

        <template v-if='showFilter'>
            <div class='col col--12 grid border border--gray px6 py6 round mb12 relative'>
                <div class='absolute triangle--u triangle color-gray' style='top: -12px; right: 75px;'></div>

                <div class='col col--6 px6'>
                    <label>Username/Email Filter</label>
                    <input v-model='filter.name' class='input' placeholder='john-doe' />
                </div>
                <div class='col col--3 px6'>
                    <label>Access</label>
                    <div class='w-full select-container'>
                        <select v-model='filter.access' class='select'>
                            <option>all</option>
                            <option>disabled</option>
                            <option>admin</option>
                            <option>user</option>
                        </select>
                        <div class='select-arrow'></div>
                    </div>
                </div>
                <div class='col col--3 px6'>
                    <label>Level</label>
                    <div class='w-full select-container'>
                        <select v-model='filter.level' class='select'>
                            <option>all</option>
                            <option>basic</option>
                            <option>backer</option>
                            <option>sponsor</option>
                        </select>
                        <div class='select-arrow'></div>
                    </div>
                </div>
            </div>
        </template>


        <template v-if='loading'>
            <div class='flex flex--center-main w-full py24'>
                <div class='loading'></div>
            </div>
        </template>
        <template v-else-if='!users.length'>
            <div class='flex flex--center-main w-full'>
                <div class='py24'>
                    <svg class='icon h60 w60 color-gray'><use href='#icon-info'/></svg>
                </div>
            </div>
            <div class='w-full align-center txt-bold'>No Users Found</div>
        </template>
        <template v-else>
            <div :key='user.id' v-for='user in users' class='col col--12 grid'>
                <div @click='user._open = !user._open' class='grid col col--12 bg-gray-light-on-hover cursor-pointer px12 py12 round'>
                    <div class='col col--4'>
                        <span class='txt-truncate' v-text='user.username'/>
                    </div>
                    <div class='col col--6'>
                        <span class='txt-truncate' v-text='user.email'/>
                    </div>
                    <div class='col col--2'>
                        <span v-if='user.access === "disabled"' class='mx3 fr bg-red-faint color-red round inline-block px6 py3 txt-xs txt-bold' v-text='user.access'></span>
                        <span v-else class='mx3 fr bg-blue-faint color-blue round inline-block px6 py3 txt-xs txt-bold' v-text='user.access'></span>

                        <span v-if='user.level !== "basic"' class='mx3 fr bg-purple-faint color-purple round inline-block px6 py3 txt-xs txt-bold' v-text='user.level'></span>
                    </div>
                </div>

                <div v-if='user._open' class='col col-12 border border--gray-light round px12 py12 my6 grid'>
                    <h3 class='pb6 w-full'>User Access</h3>

                    <div class='col col--12'>
                        <div class='w-full select-container'>
                            <select @change='patchUser(user)' v-model='user.access' class='select'>
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
                </div>
            </div>
        </template>

        <Pager v-if='users.length' @page='page = $event' :perpage='perpage' :total='total'/>
    </div>
</template>

<script>
import Pager from '../util/Pager.vue';

export default {
    name: 'ProfileAdminUser',
    props: [ ],
    data: function() {
        return {
            loading: false,
            filter: {
                name: '',
                level: 'all',
                access: 'all'
            },
            showFilter: false,
            page: 0,
            perpage: 100,
            total: 100,
            users: []
        };
    },
    mounted: function() {
        this.refresh();
    },
    watch:  {
        page: function() {
            this.getUsers();
        },
        'filter.name': function() {
            this.page = 0;
            this.getUsers();
        },
        'filter.level': function() {
            this.page = 0;
            this.getUsers();
        },
        'filter.access': function() {
            this.page = 0;
            this.getUsers();
        }
    },
    methods: {
        refresh: function() {
            this.getUsers();
        },
        getUsers: async function() {
            try {
                this.loading = true;

                const url = new URL(`${window.location.origin}/api/user`);
                url.searchParams.append('limit', this.perpage)
                url.searchParams.append('page', this.page)
                url.searchParams.append('filter', this.filter.name)

                if (this.filter.level !== 'all') url.searchParams.append('level', this.filter.level)
                if (this.filter.access !== 'all') url.searchParams.append('access', this.filter.access)

                const res = await window.std(url);
                this.total = res.total;
                this.users = res.users.map((user) => {
                    user._open = false;
                    return user;
                });
                this.loading = false;
            } catch (err) {
                this.$emit('err', err);
            }
        },
        patchUser: async function(user) {
            try {
                const res = await window.std(`/api/user/${user.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        access: user.access,
                        flags: user.flags
                    })
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
        Pager
    }
}
</script>
