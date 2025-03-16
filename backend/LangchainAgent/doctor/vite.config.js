import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:6500',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '')
      },
    },
    // Add these configurations for ngrok
    hmr: {
      clientPort: 443 // Required for ngrok
    },
    host: true, // Listen on all available network interfaces
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.ngrok-free.app', // Allow all ngrok-free.app subdomains
      '.ngrok.io', // Allow all ngrok.io subdomains
    ],
  },
});