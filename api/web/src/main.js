import Vue from 'vue'
import VueRouter from 'vue-router';
import VTooltip from 'v-tooltip';
import App from './App.vue'

Vue.config.productionTip = false
Vue.use(VueRouter);
Vue.use(VTooltip);

// === Components ===

import Register from './components/Register.vue';
import Profile from './components/Profile.vue';
import Export from './components/Export.vue';
import Upload from './components/Upload.vue';
import Errors from './components/Errors.vue';
import Login from './components/Login.vue';
import Forgot from './components/Forgot.vue';
import Verify from './components/Verify.vue';
import Reset from './components/Reset.vue';
import History from './components/History.vue';
import Data from './components/Data.vue';
import Runs from './components/Runs.vue';
import Jobs from './components/Jobs.vue';
import Job from './components/Job.vue';
import Run from './components/Run.vue';
import JobLog from './components/JobLog.vue';
import JobRaw from './components/JobRaw.vue';

// === Routes ===

const router = new VueRouter({
    mode: 'history',
    routes: [
        { path: '/', redirect: '/data' },

        { path: '/errors', component: Errors },

        { path: '/run', component: Runs },
        { path: '/run/:runid', component: Run, props: true },

        { path: '/export/:exportid', component: Export, props: true },

        { path: '/job', component: Jobs },
        { path: '/job/:jobid', component: Job, props: true },
        { path: '/job/:jobid/log', component: JobLog, props: true },
        { path: '/job/:jobid/raw', component: JobRaw, props: true },

        { path: '/data', component: Data },
        { path: '/data/:dataid/history', component: History, props: true },

        { path: '/login', component: Login },
        { path: '/login/verify', component: Verify },
        { path: '/login/forgot', component: Forgot },
        { path: '/login/reset', component: Reset },
        { path: '/profile', component: Profile },
        { path: '/register', component: Register },

        { path: '/upload', component: Upload }
    ]
});

window.std = async function(url, opts = {}) {
    try {
        url = new URL(url);
    } catch (err) {
        url = new URL(window.location.origin + url);
    }

    try {
        const res = await fetch(url, opts);

        let bdy = {};
        if ((res.status < 200 || res.status >= 400) && ![401].includes(res.status)) {
            try {
                bdy = await res.json();
            } catch (err) {
                throw new Error(`Status Code: ${res.status}`);
            }

            if (bdy.message) throw new Error(bdy.message);
            else throw new Error(`Status Code: ${res.status}`);
        }

        return await res.json();
    } catch (err) {
        throw new Error(err.message);
    }
}

new Vue({
    router: router,
    render: h => h(App)
}).$mount('#app')
