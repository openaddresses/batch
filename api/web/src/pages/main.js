import { createApp } from 'vue'
import * as VueRouter from 'vue-router';
import VTooltip from 'v-tooltip';
import App from './App.vue'
import std from '../std.js';
std();

// === Components ===

import Register from '../components/Register.vue';
import Export from '../components/Export.vue';
import Exports from '../components/Exports.vue';
import Upload from '../components/Upload.vue';
import Errors from '../components/Errors.vue';
import Login from '../components/Login.vue';
import Forgot from '../components/Forgot.vue';
import Verify from '../components/Verify.vue';
import Reset from '../components/Reset.vue';
import History from '../components/History.vue';
import Data from '../components/Data.vue';
import Runs from '../components/Runs.vue';
import Jobs from '../components/Jobs.vue';
import Job from '../components/Job.vue';
import Run from '../components/Run.vue';
import JobLog from '../components/JobLog.vue';
import JobRaw from '../components/JobRaw.vue';
import Location from '../components/Location.vue';

import NotFound from '../components/NotFound.vue';

import Profile from '../components/Profile.vue';
import ProfileDefault from '../components/profile/ProfileDefault.vue';
import ProfileAnalytics from '../components/profile/ProfileAnalytics.vue';
import ProfileAdmin from '../components/profile/ProfileAdmin.vue';

// === Routes ===

const router = new VueRouter.createRouter({
    mode: VueRouter.createWebHistory(),
    routes: [
        { path: '/', redirect: '/data' },

        { path: '/errors', component: Errors },

        { path: '/run', component: Runs },
        { path: '/run/:runid', component: Run, props: true },

        { path: '/export/', component: Exports, props: true },
        { path: '/export/:exportid', component: Export, props: true },

        { path: '/job', component: Jobs },
        { path: '/job/:jobid', component: Job, props: true },
        { path: '/job/:jobid/log', component: JobLog, props: true },
        { path: '/job/:jobid/raw', component: JobRaw, props: true },

        { path: '/location/:locid', component: Location, props: true },

        { path: '/data', component: Data },
        { path: '/data/:dataid/history', component: History, props: true },

        { path: '/login', component: Login },
        { path: '/login/verify', component: Verify },
        { path: '/login/forgot', component: Forgot },
        { path: '/login/reset', component: Reset },

        {
            path: '/profile',
            component: Profile,
            children: [{
                path: '',
                name: 'ProfileDefault',
                component: ProfileDefault
            },{
                path: 'analytics',
                name: 'ProfileAnalytics',
                component: ProfileAnalytics
            },{
                path: 'admin',
                name: 'ProfileAdmin',
                component: ProfileAdmin
            }]
        },

        { path: '/register', component: Register },

        { path: '/upload', component: Upload },

        { path: '/.*', component: NotFound }
    ]
});

const app = createApp(App);

app.config.devtools = true
app.use(router);
app.use(VTooltip);
app.mount('#app');
