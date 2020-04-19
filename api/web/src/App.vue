<template>
    <div id='app' class='col col--12'>
        <div class='col col--12 px12 py12 border-b border--gray'>
            <img @click='external("https://openaddresses.io")' class='h24 w24 round mr12 cursor-pointer' src='../public/logo.jpg'/>
            <router-link to='/data'><button class='btn btn--stroke btn--s btn--gray round mr12'>Data</button></router-link>
            <router-link to='/run'><button class='btn btn--stroke btn--s btn--gray round mr12'>Runs</button></router-link>
            <router-link to='/job'><button class='btn btn--stroke btn--s btn--gray round mr12'>Jobs</button></router-link>
            <router-link to='/admin'><button class='btn btn--stroke btn--s btn--gray round mr12'>Admin</button></router-link>

            <span class='fr'>
                <button @click='external("/docs", true)' class='btn btn--stroke btn--s btn--gray round mr12'>Docs</button>
                <router-link to='/login'><button class='btn btn--stroke btn--s btn--gray round mr12'>Login</button></router-link>
            </span>
        </div>

        <div class='col col--12 flex-parent flex-parent--center-main relative'>
            <div class='flex-child col col--12 wmax600'>
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
        external: function(url, tab) {
            if (!tab) {
                window.location.href = url;
            } else {
                window.open(url, "_blank");
            }
        }
    }
}
</script>
