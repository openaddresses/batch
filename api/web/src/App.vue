<template>
    <div id='app' class='col col--12'>
        <div class='col col--12 px12 py12 border-b border--gray'>
            <img @click='external("https://openaddresses.io")' class='h24 w24 round mr12 cursor-pointer' src='../public/logo.jpg'/>
            <router-link to='/data'><button class='btn btn--stroke btn--s btn--gray round mr12'>Data</button></router-link>
            <router-link to='/run'><button class='btn btn--stroke btn--s btn--gray round mr12'>Runs</button></router-link>
            <router-link to='/job'><button class='btn btn--stroke btn--s btn--gray round mr12'>Jobs</button></router-link>

            <router-link to='/login'><button class='fr btn btn--stroke btn--s btn--gray round mr12'>Login</button></router-link>
        </div>

        <div class='col col--12 flex-parent flex-parent--center-main'>
            <div class='flex-child wmax600 col col--12'>
                  <router-view></router-view>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'OpenAddresses',
    data: function() {
        return {
            runid: false,
            jobid: false,
            dataid: false
        };
    },
    methods: {
        external: function(url) {
            window.location.href = url;
        }
    }
}
</script>
