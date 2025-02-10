<template>
    <div class='page relative'>
        <header
            class='navbar navbar-expand-md d-print-none sticky-top'
            data-bs-theme='dark'
        >
            <div class='container-xl'>
                <div class='col-auto'>
                    <img
                        class='cursor-pointer'
                        height='40'
                        width='40'
                        src='/logo.jpg'
                        @click='$router.push("/")'
                    >
                </div>
                <div class='col mx-2'>
                    <div class='page-pretitle'>
                        OpenAddresses
                    </div>
                    <h2 class='page-title'>
                        Batch Processing
                    </h2>
                </div>

                <div class='ms-auto'>
                    <div class='btn-list'>
                        <a
                            href='/docs/'
                            class='btn btn-dark'
                            target='_blank'
                            rel='noreferrer'
                        >
                            <IconHelp size='32' />
                        </a>
                        <a
                            v-if='false'
                            href='/map'
                            class='btn btn-dark'
                            target='_blank'
                            rel='noreferrer'
                        >
                            <IconMap size='32' />
                        </a>

                        <div class='dropdown'>
                            <div
                                id='userProfileButton'
                                type='button'
                                data-bs-toggle='dropdown'
                                aria-expanded='false'
                                class='btn btn-dark'
                            >
                                <IconMenu size='32' />
                            </div>
                            <ul
                                class='dropdown-menu'
                                aria-labelledby='userProfileButton'
                            >
                                <a
                                    class='dropdown-item cursor-pointer'
                                    @click='$router.push("/run")'
                                >Runs</a>
                                <a
                                    class='dropdown-item cursor-pointer'
                                    @click='$router.push("/job")'
                                >Jobs</a>
                                <a
                                    class='dropdown-item cursor-pointer'
                                    @click='$router.push("/error")'
                                >Errors</a>
                                <a
                                    class='dropdown-item cursor-pointer'
                                    @click='$router.push("/upload")'
                                > Contribute</a>
                            </ul>
                        </div>

                        <a
                            class='btn btn-dark'
                            target='_blank'
                            rel='noreferrer'
                        >
                            <div
                                v-if='auth.username'
                                class='dropdown'
                            >
                                <div
                                    id='userProfileButton'
                                    type='button'
                                    data-bs-toggle='dropdown'
                                    aria-expanded='false'
                                >
                                    <IconUser size='32' />
                                </div>
                                <ul
                                    class='dropdown-menu'
                                    aria-labelledby='userProfileButton'
                                >
                                    <a
                                        class='cursor-pointer dropdown-item'
                                        @click='$router.push("/profile")'
                                    >Profile</a>
                                    <a
                                        v-if='auth && auth.access === "admin"'
                                        class='cursor-pointer dropdown-item'
                                        @click='$router.push(`/profile/admin`)'
                                    >Admin</a>
                                    <a
                                        class='cursor-pointer dropdown-item'
                                        @click='$router.push("/logout")'
                                    >Logout</a>
                                </ul>
                            </div>


                            <IconLogin
                                v-else
                                size='32'
                                @click='$router.push("/login")'
                            />
                        </a>
                    </div>
                </div>
            </div>
        </header>

        <router-view
            :auth='auth'
            @auth='getLogin'
        />

        <TablerError
            v-if='err'
            :err='err'
            @close='err = null'
        />
    </div>
</template>

<script>
import '@tabler/core/dist/js/tabler.min.js';
import '@tabler/core/dist/css/tabler.min.css';
import Err from '../components/Err.vue'
import {
    IconHelp,
    IconMenu,
    IconUser,
    IconLogin,
    IconMap
} from '@tabler/icons-vue'
import {
    TablerError
} from '@tak-ps/vue-tabler';

export default {
    name: 'OpenAddresses',
    components: {
        Err,
        IconHelp,
        IconMenu,
        IconUser,
        IconLogin,
        IconMap,
        TablerError
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
    mounted: async function() {
        await this.getLogin();
        await this.getCount();
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
                this.auth = {
                    username: false,
                    email: false,
                    access: false,
                    flags: {}
                };
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
    }
}
</script>
