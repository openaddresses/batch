<template>
<div>
    <div class='page-wrapper'>
        <div class="page-header d-print-none">
            <div class="container-xl">
                <div class="row g-2 align-items-center">
                    <div class="d-flex">
                        <TablerBreadCrumb/>

                        <div class='ms-auto btn-list'>
                            <button
                                v-if='auth && auth.access === "admin"'
                                @click='$router.push(`/profile/admin`)'
                                class='btn btn-primary'
                            >Admin</button>
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
    TablerLoading,
    TablerBreadCrumb
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
            loading: {
                profile: true
            }
        }
    },
    mounted: function() {
        this.getLogin();
    },
    methods: {
        getLogin: async function() {
            try {
                this.loading.profile = true;

                const url = new URL(`${window.location.origin}/api/login`);
                url.searchParams.append('level', 'true');

                this.profile = await window.std(url)
                this.loading.profile = false;
            } catch (err) {
                this.$emit('err', err);
            }
        }
    },
    components: {
        TablerBreadCrumb,
        TablerLoading
    }
}
</script>
