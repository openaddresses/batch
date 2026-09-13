import { createApp } from 'vue';

import App from './App.vue';
import std from '../../std.js';
std();

const app = createApp(App);
app.mount('#app');
