<template>
<div>
    <div class='page-wrapper'>
        <div class="page-header d-print-none">
            <div class="container-xl">
                <div class="row g-2 align-items-center">
                    <div class="d-flex">
                        <TablerBreadCrumb/>

                        <div class='ms-auto btn-list'>
                            <template v-if='auth && auth.access === "admin" && $route.name === "ProfileDefault"'>
                                <button
                                    @click='$router.push(`/profile/admin`)'
                                    class='btn btn-primary'
                                >Admin</button>
                            </template>
                            <template v-else-if='auth && auth.access === "admin" && $route.name === "ProfileAdmin"'>
                                <TablerLoading v-if='loading.collections' :inline='true' desc='Refresh Collections'/>
                                <TablerLoading v-if='loading.cache' :inline='true' desc='Reset Cache'/>
                                <TablerLoading v-if='loading.fabric' :inline='true' desc='Refresh Fabric'/>

                                <span v-if='done.cache' @click='done.cache = false' class='cursor-pointer'><CheckIcon/>Cache Cleared</span>
                                <span v-if='done.collections' @click='done.cache = false' class='cursor-pointer'><CheckIcon/>Collection Refresh Submitted</span>
                                <span v-if='done.fabric' @click='done.cache = false' class='cursor-pointer'><CheckIcon/>Fabric Refresh Submitted</span>

                                <TablerDropdown>
                                    <slot><SettingsIcon class='cursor-pointer mx-3'/></slot>
                                    <template #dropdown>
                                        <div @click='fabric' class='cursor-pointer text-center my-2'>Refresh Fabric</div>
                                        <div @click='clear' class='cursor-pointer text-center my-2'>Clear Cache</div>
                                        <div @click='collections' class='cursor-pointer text-center my-2'>Refresh Collections</div>
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
            <TablerLoading v-if='loading.profile' desc='Loading Profile'/>
            <router-view v-else :profile='profile' @refresh='getLogin' @err='$emit("err", $event)'/>
        </div>
    </div>
</div>
</template>

<script>
import {
    SettingsIcon,
    CheckIcon,
} from 'vue-tabler-icons';

import {
    TablerLoading,
    TablerBreadCrumb,
    TablerDropdown
} from '@tak-ps/vue-tabler';

export default {
    name: 'Profile',
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
    },
    components: {
        SettingsIcon,
        TablerBreadCrumb,
        TablerLoading,
        TablerDropdown,
        CheckIcon,
    }
}
</script>
