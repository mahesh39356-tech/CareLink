import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

const isHttps = process.env.HTTPS === 'true' || process.argv.includes('--https');

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ...(isHttps ? [basicSsl()] : []),
  ],
  server: {
    port: 5173,
    strictPort: true,
    host: '0.0.0.0', // binds to 0.0.0.0 for LAN/Wi-Fi mobile access
    cors: true,
    hmr: {
      protocol: isHttps ? 'wss' : 'ws',
      host: '127.0.0.1',
    },
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.warn('[Vite Proxy Connection Warning]:', err.message);
          });
        },
      },
    },
  },
});
