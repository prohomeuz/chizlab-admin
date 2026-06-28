import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@contracts': path.resolve(__dirname, '../../packages/contracts'),
        },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': 'http://localhost:3000',
        },
    },
});
