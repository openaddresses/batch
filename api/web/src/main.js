import Vue from 'vue'
import VueRouter from 'vue-router';
import App from './App.vue'

Vue.config.productionTip = false
Vue.use(VueRouter);

// === Components ===

import Register from './components/Register.vue';
import Profile from './components/Profile.vue';
import Upload from './components/Upload.vue';
import Admin from './components/Admin.vue';
import Login from './components/Login.vue';
import History from './components/History.vue';
import Data from './components/Data.vue';
import Runs from './components/Runs.vue';
import Jobs from './components/Jobs.vue';
import Job from './components/Job.vue';
import Run from './components/Run.vue';
import Log from './components/Log.vue';

// === Routes ===

const router = new VueRouter({
    mode: 'history',
    routes: [
        { path: '/', redirect: '/data' },

        { path: '/admin', component: Admin },

        { path: '/run', component: Runs },
        { path: '/run/:runid', component: Run, props: true },

        { path: '/job', component: Jobs },
        { path: '/job/:jobid', component: Job, props: true },
        { path: '/job/:jobid/log', component: Log, props: true },

        { path: '/data', component: Data },
        { path: '/data/:dataid/history', component: History, props: true },

        { path: '/login', component: Login },
        { path: '/profile', component: Profile },
        { path: '/register', component: Register },

        { path: '/upload', component: Upload }
    ]
});

new Vue({
    router: router,
    render: h => h(App)
}).$mount('#app')
