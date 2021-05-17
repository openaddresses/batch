<template>
    <div class='col col--12 grid pt24'>
        <div class='col col--12 grid border-b border--gray-light'>
            <div class='col col--12'>
                <h2 v-if='$route.name === "ProfileDefault"' class='txt-h4 ml12 pb12 fl'>Profile:</h2>
                <h2 v-else-if='$route.name === "ProfileAnalytics"' class='txt-h4 ml12 pb12 fl'>Analytics:</h2>
                <h2 v-else-if='$route.name === "ProfileAdmin"' class='txt-h4 ml12 pb12 fl'>Administration:</h2>

                <div class='fr'>
                    <div v-if='profile.access === "admin"' class='flex-inline'>
                        <button @click='$router.push("/profile/")' :class='{ "btn--stroke": $route.name !== "ProfileDefault" }' class='btn btn--s btn--pill btn--pill-hl round mx0'>Profile</button>
                        <button @click='$router.push("/profile/analytics")' :class='{ "btn--stroke": $route.name !== "ProfileAnalytics" }' class='btn btn--s btn--pill btn--pill-hc round mx0'>Analytics</button>
                        <button @click='$router.push("/profile/admin")' :class='{ "btn--stroke": $route.name !== "ProfileAdmin" }' class='btn btn--s btn--pill btn--pill-hr round mx0'>Admin</button>
                    </div>
                </div>
            </div>
        </div>

        <template v-if='loading.profile'>
            <div class='flex flex--center-main w-full py24'>
                <div class='loading'></div>
            </div>
        </template>
        <template v-else>
            <router-view :profile='profile' @refresh='getLogin' @err='$emit("err", $event)'/>
        </template>
    </div>
</template>

<script>

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
    }
}
</script>
