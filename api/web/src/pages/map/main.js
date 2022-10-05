import { createApp } from 'vue';
import * as VueRouter from 'vue-router';
import FloatingVue from 'floating-vue';

import App from './App.vue'
import std from '../../std.js';
std();

const router = new VueRouter.createRouter({
    history: VueRouter.createWebHistory(),
    routes: [
        { path: '/' },
    ]
});

const app = createApp(App);
app.config.devtools = true
app.use(router);
app.use(FloatingVue);

app.mount('#app');

