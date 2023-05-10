<template>
<div class='page-body'>
    <div class='container-xl'>
        <div class='row row-deck row-cards'>
            <div class='col-12'>
                <div class='card'>
                    <div class='card-header'>
                        <h2 v-if='$route.name === "ProfileDefault"' class='card-title'>Profile:</h2>
                        <h2 v-else-if='$route.name === "ProfileAdmin"' class='card-title'>Administration:</h2>

                        <div class='ms-auto'>
                            <div v-if='profile.access === "admin"' class='flex-inline'>
                                <button @click='$router.push("/profile/")' :class='{ "btn--stroke": $route.name !== "ProfileDefault" }' class='btn btn--s btn--pill btn--pill-hl round mx0'>Profile</button>
                                <button @click='$router.push("/profile/admin")' :class='{ "btn--stroke": $route.name !== "ProfileAdmin" }' class='btn btn--s btn--pill btn--pill-hr round mx0'>Admin</button>
                            </div>
                        </div>
                    </div>
                    <div class='card-body'>
                        <TablerLoading v-if='loading.profile' desc='Loading Profile'/>
                        <template v-else>
                            <router-view :profile='profile' @refresh='getLogin' @err='$emit("err", $event)'/>
                        </template>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
</template>

<script>
import {
    TablerLoading
} from '@tak-ps/vue-tabler';

export default {
    name: 'Profile',
    props: [ ],
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
        TablerLoading
    }
}
</script>
