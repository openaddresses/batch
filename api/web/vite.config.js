import { defineConfig } from 'vite'
import path from 'node:path';
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    plugins: [
        vue(),
        {
            name: 'configure-server',
            configureServer(server) {
                server.middlewares.use((req, res, next) => {
                    if (req.url?.startsWith('/docs') && !path.extname(req.url)) {
                        req.url = '/docs.html';
                    }
                    next();
                });
            }
        }
    ],
    optimizeDeps: {
        include: ["showdown"],
    },
    build: {
        target: 'esnext',
        rolldownOptions: {
            input: {
                main: path.resolve(import.meta.dirname, 'index.html'),
                docs: path.resolve(import.meta.dirname, 'docs.html'),
            },
        },
    },
    worker: {
        format: 'es'
    },
    server: {
        port: 8080,
        proxy: {
            '/api': {
                ws: true,
                target: 'http://localhost:4999',
                changeOrigin: true,
            }
        }
    }
})
