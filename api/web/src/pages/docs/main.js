import { createApp } from 'vue';
import { createHead } from '@unhead/vue/client';

import App from './App.vue';
import std from '../../std.js';
std();

const app = createApp(App);
app.use(createHead());
app.mount('#app');
