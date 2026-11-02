<template>
    <div class='page relative'>
        <header
            class='navbar navbar-expand-md d-print-none sticky-top'
            data-bs-theme='dark'
        >
            <div class='container-xl'>
                <div class='col-auto'>
                    <router-link to='/'>
                        <img
                            height='50'
                            width='50'
                            src='/logo.jpg'
                            alt='OpenAddresses'
                            title='Home'
                        >
                    </router-link>
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
                    <div class='btn-list align-items-center'>
                        <button
                            class='btn btn-dark dropdown-toggle d-md-none'
                            type='button'
                            data-bs-toggle='dropdown'
                            aria-expanded='false'
                            aria-label='Navigation menu'
                        >
                            <IconMenu
                                size='32'
                                stroke='1'
                            />
                        </button>
                        <div class='dropdown-menu dropdown-menu-end'>
                            <router-link
                                v-for='link in links'
                                :key='link.path'
                                class='dropdown-item'
                                :to='link.path'
                            >
                                <span v-text='link.label' />
                            </router-link>
                            <a
                                class='dropdown-item'
                                href='/docs'
                                target='_blank'
                                rel='noreferrer'
                            >API Docs</a>
                        </div>

                        <NavProfile
                            v-if='auth.username'
                            :auth='auth'
                        />
                        <router-link
                            v-else
                            class='btn btn-dark'
                            to='/login'
                        >
                            <IconLogin
                                :size='24'
                                stroke='1.5'
                                class='me-1'
                            />
                            Sign in
                        </router-link>
                    </div>
                </div>
            </div>
        </header>

        <div class='navbar-expand-md d-print-none'>
            <div class='collapse navbar-collapse'>
                <div class='navbar navbar-light'>
                    <div class='container-xl'>
                        <ul class='navbar-nav'>
                            <li
                                v-for='link in links'
                                :key='link.path'
                                class='nav-item'
                            >
                                <router-link
                                    class='nav-link'
                                    active-class='active'
                                    :to='link.path'
                                >
                                    <span class='nav-link-icon d-md-none d-lg-inline-block'>
                                        <component
                                            :is='link.icon'
                                            size='32'
                                            stroke='2'
                                        />
                                    </span>
                                    <span
                                        class='nav-link-title'
                                        v-text='link.label'
                                    />
                                </router-link>
                            </li>
                        </ul>
                        <div class='ms-auto'>
                            <ul class='navbar-nav'>
                                <li
                                    v-if='auth.access === "admin"'
                                    class='nav-item'
                                >
                                    <router-link
                                        class='nav-link'
                                        active-class='active'
                                        to='/profile/admin'
                                    >
                                        <span class='nav-link-icon d-md-none d-lg-inline-block'>
                                            <IconAdjustments
                                                size='32'
                                                stroke='2'
                                            />
                                        </span>
                                        <span class='nav-link-title'>Admin</span>
                                    </router-link>
                                </li>
                                <li class='nav-item'>
                                    <a
                                        class='nav-link'
                                        href='/docs'
                                        target='_blank'
                                        rel='noreferrer'
                                    >
                                        <span class='nav-link-icon d-md-none d-lg-inline-block'>
                                            <IconBook
                                                size='32'
                                                stroke='2'
                                            />
                                        </span>
                                        <span class='nav-link-title'>API Docs</span>
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <router-view
            :auth='auth'
            @auth='getLogin'
            @err='err = $event'
            @login='mustlogin = true'
            @perk='perk = true'
        />

        <MustLogin
            v-if='mustlogin'
            @close='mustlogin = false'
        />

        <Perk
            v-if='perk'
            @close='perk = false'
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
import MustLogin from '../components/util/MustLogin.vue';
import NavProfile from '../components/util/NavProfile.vue';
import Perk from '../components/util/Perk.vue';
import {
    IconAdjustments,
    IconAlertTriangle,
    IconBook,
    IconDatabase,
    IconListDetails,
    IconLogin,
    IconMap,
    IconMenu,
    IconRocket,
    IconUpload
} from '@tabler/icons-vue'
import {
    TablerError
} from '@tak-ps/vue-tabler';

export default {
    name: 'OpenAddresses',
    components: {
        MustLogin,
        NavProfile,
        Perk,
        IconAdjustments,
        IconBook,
        IconLogin,
        IconMenu,
        TablerError
    },
    data: function() {
        return {
            mustlogin: false,
            perk: false,
            err: false,
            links: [
                { path: '/data', label: 'Data', icon: IconDatabase },
                { path: '/run', label: 'Runs', icon: IconRocket },
                { path: '/job', label: 'Jobs', icon: IconListDetails },
                { path: '/error', label: 'Errors', icon: IconAlertTriangle },
                { path: '/map', label: 'Map', icon: IconMap },
                { path: '/upload', label: 'Contribute', icon: IconUpload }
            ],
            auth: {
                username: false,
                email: false,
                access: false,
                flags: {}
            }
        };
    },
    mounted: async function() {
        await this.getLogin();
    },
    errorCaptured: function(err) {
        this.err = err;
    },
    methods: {
        getLogin: async function() {
            try {
                this.auth = await window.std('/api/login');
            } catch {
                delete localStorage.token;
                this.auth = {
                    username: false,
                    email: false,
                    access: false,
                    flags: {}
                };
            }
        }
    }
}
</script>

<style>
.navbar-nav .nav-link {
    display: flex;
    align-items: center;
}

.dropdown-menu .dropdown-item {
    display: flex;
    align-items: center;
}
</style>
