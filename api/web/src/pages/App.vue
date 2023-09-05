<template>
<div class='page relative'>
    <header class='navbar navbar-expand-md d-print-none sticky-top' data-bs-theme="dark">
        <div class="container-xl">
            <div class="col-auto">
                <img @click='$router.push("/")' class='cursor-pointer' height='40' width='40' src='/logo.jpg'>
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
                    <a v-if='false' href="/map" class="btn btn-dark" target="_blank" rel="noreferrer">
                        <MapIcon/>
                    </a>

                    <div class='dropdown'>
                        <div type="button" id="userProfileButton" data-bs-toggle="dropdown" aria-expanded="false" class='btn btn-dark'>
                            <MenuIcon/>
                        </div>
                        <ul class="dropdown-menu" aria-labelledby='userProfileButton'>
                            <a @click='$router.push("/run")' class="dropdown-item cursor-pointer">Runs</a>
                            <a @click='$router.push("/job")' class="dropdown-item cursor-pointer">Jobs</a>
                            <a @click='$router.push("/error")' class="dropdown-item cursor-pointer">Errors</a>
                            <a @click='$router.push("/upload")' class="dropdown-item cursor-pointer"> Contribute</a>
                        </ul>
                    </div>

                    <a class="btn btn-dark" target="_blank" rel="noreferrer">
                        <UserIcon @click='$router.push("/profile")' v-if='auth.username'/>
                        <LoginIcon @click='$router.push("/login")' v-else/>
                    </a>
                </div>
            </div>
        </div>
    </header>

    <router-view
        @auth='getLogin'
        :auth='auth'
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
    MenuIcon,
    UserIcon,
    LoginIcon,
    MapIcon
} from 'vue-tabler-icons'
import {
    TablerError
} from '@tak-ps/vue-tabler';

export default {
    name: 'OpenAddresses',
    mounted: async function() {
        await this.getLogin();
        await this.getCount();
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
    errorCaptured: function(err) {
        this.err = err;
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
        MenuIcon,
        LoginIcon,
        MapIcon,
        HelpIcon,
        TablerError
    }
}
</script>
