import { createApp } from 'vue';
import * as VueRouter from 'vue-router';
import FloatingVue from 'floating-vue';

import App from './App.vue'
import std from '../std.js';
std();

// === Routes ===

const router = new VueRouter.createRouter({
    mode: VueRouter.createWebHistory(),
    routes: [
        { path: '/', redirect: '/data' },

        { path: '/errors', component: () => import('../components/Errors.vue') },

        { path: '/run', component: () => import('../components/Runs.vue') },
        { path: '/run/:runid', component: () => import('../components/Run.vue'), props: true },

        { path: '/export/', component: () => import('../components/Exports.vue'), props: true },
        { path: '/export/:exportid', component: () => import('../components/Export.vue'), props: true },

        { path: '/job', component: () => import('../components/Jobs.vue') },
        { path: '/job/:jobid', component: () => import('../components/Job.vue'), props: true },
        { path: '/job/:jobid/log', component: () => import('../components/JobLog.vue'), props: true },
        { path: '/job/:jobid/raw', component: () => import('../components/JobRaw.vue'), props: true },

        { path: '/location/:locid', component: () => import('../components/Location.vue'), props: true },

        { path: '/data', component: () => import('../components/Data.vue') },
        { path: '/data/:dataid/history', component: () => import('../components/History.vue'), props: true },

        { path: '/login', component: () => import('../components/Login.vue') },
        { path: '/login/verify', component: () => import('../components/Verify.vue') },
        { path: '/login/forgot', component: () => import('../components/Forgot.vue') },
        { path: '/login/reset', component: () => import('../components/Reset.vue') },

        {
            path: '/profile',
            component: () => import('../components/Profile.vue'),
            children: [{
                path: '',
                name: 'ProfileDefault',
                component: () => import('../components/profile/ProfileDefault.vue')
            },{
                path: 'analytics',
                name: 'ProfileAnalytics',
                component: () => import('../components/profile/ProfileAnalytics.vue')
            },{
                path: 'admin',
                name: 'ProfileAdmin',
                component: () => import('../components/profile/ProfileAdmin.vue')
            }]
        },

        { path: '/register', component: () => import('../components/Register.vue') },

        { path: '/upload', component: () => import('../components/Upload.vue') },

        { path: '*', component: () => import('../components/NotFound.vue') }
    ]
});

const app = createApp(App);
app.config.devtools = true
app.use(router);
app.use(FloatingVue);
app.mount('#app');
