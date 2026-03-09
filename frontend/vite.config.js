import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': { target: 'http://localhost:9810', changeOrigin: true },
      '/expense': { target: 'http://localhost:9820', changeOrigin: true },
      '/user': { target: 'http://localhost:9898', changeOrigin: true },
      '/v1/ds': { target: 'http://localhost:8010', changeOrigin: true },
      '/api/mistral': {
        target: 'https://api.mistral.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mistral/, '/v1')
      },
      '/public-api': {
        target: 'http://localhost:9820',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/public-api/, '/expense/v1/public/report')
      }
    }
  },
})

console.log('Reloading Vite Proxy Config for Microservices...');
