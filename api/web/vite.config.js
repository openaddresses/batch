import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    plugins: [
        vue()
    ],
    optimizeDeps: {
        include: ["showdown"],
    },
    worker: {
        format: 'es'
    },
    server: {
        port: 8080,
    }
})
