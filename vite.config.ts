import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // permite acceso desde la red y túneles externos
    port: 5173,
    allowedHosts: [
      '.ngrok-free.app',    // para túneles de ngrok nuevos
      '.ngrok-free.dev',    // versiones antiguas de ngrok
      '.loca.lt',           // localtunnel
      '.trycloudflare.com'  // cloudflare tunnel
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:8000', // tu backend Django
        changeOrigin: true,
        secure: false,
      },
    },
  },
})