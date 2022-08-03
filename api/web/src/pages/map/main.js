import { createApp } from 'vue'
import * as VueRouter from 'vue-router';
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

const router = new VueRouter.createRouter({
    mode: VueRouter.createWebHistory(),
    routes: [
        { path: '/' },
    ]
});

const app = createApp(App);

app.config.devtools = true
app.use(router);
app.use(VTooltip);
app.mount('#app');

