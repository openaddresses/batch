<template>
    <div>
        <div class='page-wrapper'>
            <div class='page-header d-print-none'>
                <div class='container-xl'>
                    <div class='row g-2 align-items-center'>
                        <div class='d-flex'>
                            <TablerBreadCrumb />

                            <div class='ms-auto btn-list'>
                                <template v-if='auth && auth.access === "admin" && $route.name === "ProfileDefault"'>
                                    <button
                                        class='btn btn-primary'
                                        @click='$router.push(`/profile/admin`)'
                                    >
                                        Admin
                                    </button>
                                </template>
                                <template v-else-if='auth && auth.access === "admin" && $route.name === "ProfileAdmin"'>
                                    <TablerLoading
                                        v-if='loading.collections'
                                        :inline='true'
                                        desc='Refresh Collections'
                                    />
                                    <TablerLoading
                                        v-if='loading.cache'
                                        :inline='true'
                                        desc='Reset Cache'
                                    />
                                    <TablerLoading
                                        v-if='loading.fabric'
                                        :inline='true'
                                        desc='Refresh Fabric'
                                    />

                                    <span
                                        v-if='done.cache'
                                        class='cursor-pointer'
                                        @click='done.cache = false'
                                    ><IconCheck size='32' />Cache Cleared</span>
                                    <span
                                        v-if='done.collections'
                                        class='cursor-pointer'
                                        @click='done.cache = false'
                                    ><IconCheck size='32' />Collection Refresh Submitted</span>
                                    <span
                                        v-if='done.fabric'
                                        class='cursor-pointer'
                                        @click='done.cache = false'
                                    ><IconCheck size='32' />Fabric Refresh Submitted</span>

                                    <TablerDropdown>
                                        <slot>
                                            <IconSettings
                                                class='cursor-pointer mx-3'
                                                size='32'
                                            />
                                        </slot>
                                        <template #dropdown>
                                            <div
                                                class='cursor-pointer text-center my-2'
                                                @click='fabric'
                                            >
                                                Refresh Fabric
                                            </div>
                                            <div
                                                class='cursor-pointer text-center my-2'
                                                @click='clear'
                                            >
                                                Clear Cache
                                            </div>
                                            <div
                                                class='cursor-pointer text-center my-2'
                                                @click='collections'
                                            >
                                                Refresh Collections
                                            </div>
                                        </template>
                                    </TablerDropdown>
                                </template>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class='page-body'>
            <div class='container-xl'>
                <TablerLoading
                    v-if='loading.profile'
                    desc='Loading Profile'
                />
                <router-view
                    v-else
                    :profile='profile'
                    @refresh='getLogin'
                    @err='$emit("err", $event)'
                />
            </div>
        </div>
    </div>
</template>

<script>
import {
    IconSettings,
    IconCheck,
} from '@tabler/icons-vue';

import {
    TablerLoading,
    TablerBreadCrumb,
    TablerDropdown
} from '@tak-ps/vue-tabler';

export default {
    name: 'Profile',
    components: {
        IconSettings,
        TablerBreadCrumb,
        TablerLoading,
        TablerDropdown,
        IconCheck,
    },
    props: [ 'auth' ],
    data: function() {
        return {
            profile: {
                username: '',
                access: '',
                email: '',
                level: ''
            },
            done: {
                fabric: false,
                cache: false,
                collections: false
            },
            loading: {
                profile: true,
                fabric: false,
                cache: false,
                collections: false
            }
        }
    },
    mounted: function() {
        this.getLogin();
    },
    methods: {
        collections: async function() {
            this.loading.collections = true;
            await window.std(`/api/schedule`, {
                method: 'POST',
                body: {
                    type: 'collect'
                }
            });
            this.done.collections = true;
            this.loading.collections = false;
        },
        clear: async function() {
            this.loading.cache = true;
            await window.std(`/api/cache`, {
                method: 'DELETE'
            });
            this.done.cache = true;
            this.loading.cache = false;
        },
        fabric: async function() {
            this.loading.fabric = true;
            await window.std(`/api/schedule`, {
                method: 'POST',
                body: {
                    type: 'fabric'
                }
            });
            this.done.fabric = true;
            this.loading.fabric = false;
        },
        getLogin: async function() {
            this.loading.profile = true;

            const url = new URL(`${window.location.origin}/api/login`);
            url.searchParams.append('level', 'true');

            this.profile = await window.std(url)
            this.loading.profile = false;
        }
    }
}
</script>
