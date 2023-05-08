<template>
<div class='page'>
    <header class='navbar navbar-expand-md navbar-dark d-print-none'>
        <div class="container-xl">
            <div class="col-auto">
                <img @click='$router.push("/")' class='cursor-pointer' height='50' width='50' src='/logo.png'>
            </div>
            <div class="col mx-2">
                <div class="page-pretitle">OpenAddresses</div>
                <h2 class="page-title">Batch Processing</h2>
            </div>

            <div class='ms-auto'>
                <div class='btn-list'>
                    <a href="/docs" class="btn btn-dark" target="_blank" rel="noreferrer">
                        <HelpIcon/>
                    </a>
                    <a href="/upload" class="btn btn-dark" target="_blank" rel="noreferrer">
                        Contribute
                    </a>
                    <a href="/map" class="btn btn-dark" target="_blank" rel="noreferrer">
                        <MapIcon/>
                    </a>
                    <a href="/profile" class="btn btn-dark" target="_blank" rel="noreferrer">
                        <UserIcon/>
                    </a>
                </div>
            </div>
        </div>
    </header>

    <router-view
        :ws='ws'
    />

    <TablerError v-if='err' :err='err' @close='err = null'/>
</div>
</template>

<script>
import '@tabler/core/dist/js/tabler.min.js';
import '@tabler/core/dist/css/tabler.min.css';
import Err from '../components/Err.vue'
import {
    HelpIcon,
    UserIcon,
    MapIcon
} from 'vue-tabler-icons'
import {
    TablerError
} from '@tak-ps/vue-tabler';

export default {
    name: 'OpenAddresses',
    mounted: function() {
        this.getLogin();
        this.getCount();
    },
    data: function() {
        return {
            mustlogin: false,
            perk: false,
            errors: 0, //Number of Job Errors
            err: false,
            auth: {
                username: false,
                email: false,
                access: false,
                flags: {}
            },
            runid: false,
            jobid: false,
            dataid: false
        };
    },
    methods: {
        logout: async function() {
            try {
                this.auth = false;
                delete localStorage.token;
                this.$router.push('/data');
            } catch (err) {
                this.err = err;
            }
        },
        getLogin: async function() {
            try {
                this.auth = await window.std('/api/login');
            } catch (err) {
                delete localStorage.token;
            }
        },
        getCount: async function() {
            try {
                this.errors = (await window.std('/api/job/error/count')).count;
            } catch (err) {
                this.err = err;
            }
        },
        internal: function(url, tab) {
            url = window.location.origin + url;

            if (!tab) {
                window.location.href = url;
            } else {
                window.open(url, "_blank");
            }
        },
        external: function(url, tab) {
            if (!tab) {
                window.location.href = url;
            } else {
                window.open(url, "_blank");
            }
        },
    },
    components: {
        Err,
        UserIcon,
        MapIcon,
        HelpIcon,
        TablerError
    }
}
</script>
