<template>
    <div id='app' class='col col--12'>
        <div class='col col--12 px12 py12 border-b border--gray'>
            <img @click='external("https://openaddresses.io")' class='h24 w24 round mr12 cursor-pointer' src='../../public/logo.jpg'/>
            <router-link to='/data'><button class='btn btn--stroke btn--s btn--gray round mr12'>Data</button></router-link>
            <router-link to='/run'><button class='btn btn--stroke btn--s btn--gray round mr12'>Runs</button></router-link>
            <router-link to='/job'><button class='btn btn--stroke btn--s btn--gray round mr12'>Jobs</button></router-link>
            <router-link to='/errors'><button class='btn btn--stroke btn--s btn--gray round mr12'>
                <span class='bg-gray-light round color-gray px6' v-text='errors'/>
                Errors
            </button></router-link>



            <span class='fr'>
                <a href='mailto:hello@openaddresses.io' class='btn btn--stroke btn--s btn--gray round mr12'>Contact Us</a>

                <router-link to='/upload'><button class='btn btn--stroke btn--s btn--gray round mr12 h24'>Contribute</button></router-link>

                <button @click='internal("/docs/", true)' class='btn btn--stroke btn--s btn--gray round mr12'>Docs</button>

                <router-link v-if='!auth.username' to='/login'><button class='btn btn--stroke btn--s btn--gray round mr12'>Login</button></router-link>
                <router-link v-else to='/profile'>
                    <button class='dropdown btn btn--stroke btn--s btn--gray round mr12'>
                        <svg class='inline pt3 icon'><use xlink:href='#icon-user'/></svg><span v-text='auth.username'/>

                        <div class='round dropdown-content'>
                            <div v-on:click.stop.prevent='logout' class='round bg-gray-faint-on-hover'>Logout</div>
                        </div>
                    </button>
                </router-link>
            </span>
        </div>

        <div class='col col--12 flex flex--center-main relative'>
            <div class='col col--12 wmax600'>
                <router-view
                    :auth='auth'
                    @auth='getLogin'
                    @login='mustlogin = true'
                    @perk='perk = $event || true'
                    @err='err = $event'

                    @errors='errors = $event'
                />
            </div>
        </div>

        <Err
            v-if='err'
            :err='err'
            @err='err = $event'
        />

        <Perk
            v-if='perk'
            @perk='perk = $event'
        />

        <MustLogin
            v-if='mustlogin'
            @login='mustlogin = false'
            @err='err = $event'
        />
    </div>
</template>

<script>
import MustLogin from '../components/MustLogin.vue'
import Perk from '../components/Perk.vue'
import Err from '../components/Err.vue'

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
                await window.std('/api/login', {
                    method: 'DELETE'
                });

                this.auth = false;
                this.$router.push('/data');
            } catch (err) {
                this.err = err;
            }
        },
        getLogin: async function() {
            try {
                this.auth = await window.std('/api/login');
            } catch (err) {
                this.err = err;
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
        MustLogin,
        Perk,
        Err
    }
}
</script>

<style lang="scss">

.col--1 { width: 8.3333% !important; }
.col--2 { width: 16.6666% !important; }
.col--3 { width: 25% !important; }
.col--4 { width: 33.3333% !important; }
.col--5 { width: 41.6666% !important; }
.col--6 { width: 50% !important; }
.col--7 { width: 58.3333% !important; }
.col--8 { width: 66.6666% !important; }
.col--9 { width: 75% !important; }
.col--10 { width: 83.3333% !important; }
.col--11 { width: 91.6666% !important; }
.col--12 { width: 100% !important; }

.dropdown {
    position: relative;
    display: inline-block;
}

.dropdown-content {
    display: none;
    position: absolute;
    top: 24px;
    left: 0px;
    background-color: #f9f9f9;
    box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
    padding: 6px 12px;
    z-index: 1;
}

.dropdown:hover .dropdown-content {
    display: block;
}
.tooltip {
    display: block !important;
    z-index: 10000;
}

.tooltip .tooltip-inner {
    background: black;
    color: white;
    border-radius: 4px;
    padding: 5px 10px 4px;
}

.tooltip .tooltip-arrow {
    width: 0;
    height: 0;
    border-style: solid;
    position: absolute;
    margin: 5px;
    border-color: black;
    z-index: 1;
}

.tooltip[x-placement^="top"] {
    margin-bottom: 5px;
}

.tooltip[x-placement^="top"] .tooltip-arrow {
    border-width: 5px 5px 0 5px;
    border-left-color: transparent !important;
    border-right-color: transparent !important;
    border-bottom-color: transparent !important;
    bottom: -5px;
    left: calc(50% - 5px);
    margin-top: 0;
    margin-bottom: 0;
}

.tooltip[x-placement^="bottom"] {
    margin-top: 5px;
}

.tooltip[x-placement^="bottom"] .tooltip-arrow {
    border-width: 0 5px 5px 5px;
    border-left-color: transparent !important;
    border-right-color: transparent !important;
    border-top-color: transparent !important;
    top: -5px;
    left: calc(50% - 5px);
    margin-top: 0;
    margin-bottom: 0;
}

.tooltip[x-placement^="right"] {
    margin-left: 5px;
}

.tooltip[x-placement^="right"] .tooltip-arrow {
    border-width: 5px 5px 5px 0;
    border-left-color: transparent !important;
    border-top-color: transparent !important;
    border-bottom-color: transparent !important;
    left: -5px;
    top: calc(50% - 5px);
    margin-left: 0;
    margin-right: 0;
}

.tooltip[x-placement^="left"] {
    margin-right: 5px;
}

.tooltip[x-placement^="left"] .tooltip-arrow {
    border-width: 5px 0 5px 5px;
    border-top-color: transparent !important;
    border-right-color: transparent !important;
    border-bottom-color: transparent !important;
    right: -5px;
    top: calc(50% - 5px);
    margin-left: 0;
    margin-right: 0;
}

.tooltip.popover .popover-inner {
    background: #f9f9f9;
    color: black;
    padding: 24px;
    border-radius: 5px;
    box-shadow: 0 5px 30px rgba(black, .1);
}

.tooltip.popover .popover-arrow {
    border-color: #f9f9f9;
}

.tooltip[aria-hidden='true'] {
    visibility: hidden;
    opacity: 0;
    transition: opacity .15s, visibility .15s;
}

.tooltip[aria-hidden='false'] {
    visibility: visible;
    opacity: 1;
    transition: opacity .15s;
}
</style>
