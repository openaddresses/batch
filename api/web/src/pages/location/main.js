import Vue from 'vue'
import VueRouter from 'vue-router';
import VTooltip from 'v-tooltip';
import App from './App.vue'
import std from '../../std.js';
std();

Vue.config.productionTip = false
Vue.use(VueRouter);
Vue.use(VTooltip);

// === Components ===

//import Register from './components/Register.vue';

// === Routes ===

const router = new VueRouter({
    mode: 'history',
    routes: [
        { path: '/:locid', component: Location, props: true },
    ]
});

new Vue({
    router: router,
    render: h => h(App)
}).$mount('#app')
