import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Prohledá všechny zdroje předem – závislosti lazy rout (grafy, dnd-kit) se
  // optimalizují hned při startu a nedojde k reloadu s duplicitní kopií Reactu.
  optimizeDeps: {
    entries: ['index.html', 'src/**/*.{ts,tsx}', '!src/**/*.test.{ts,tsx}'],
  },
  server: {
    port: 5173,
    // API běží na stejném originu přes proxy – cookies jsou first-party a CORS není potřeba.
    proxy: {
      '/api': { target: process.env['VITE_API_PROXY'] ?? 'http://127.0.0.1:4000', changeOrigin: false },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': { target: process.env['VITE_API_PROXY'] ?? 'http://127.0.0.1:4000', changeOrigin: false },
    },
  },
  build: {
    sourcemap: true,
    rolldownOptions: {
      output: {
        // Stabilní vendor chunky – lepší cache v prohlížeči při nasazení nové verze.
        codeSplitting: {
          groups: [
            {
              name: 'charts',
              test: /node_modules[\\/](recharts|d3-|victory-vendor|es-toolkit|decimal\.js)/,
              priority: 30,
            },
            { name: 'dnd', test: /node_modules[\\/]@dnd-kit/, priority: 30 },
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/, priority: 20 },
            {
              name: 'ui',
              test: /node_modules[\\/](radix-ui|@radix-ui|@floating-ui|sonner|lucide-react)/,
              priority: 20,
            },
            { name: 'vendor', test: /node_modules/, priority: 10 },
          ],
        },
      },
    },
  },
});
