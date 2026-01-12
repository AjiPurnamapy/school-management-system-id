import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // Proxy untuk endpoint biasa tanpa prefix /api (karena backend kita di root)
      '/token': 'http://localhost:8000',
      '/notes': 'http://localhost:8000',
      '/register': 'http://localhost:8000',
      '/verify': 'http://localhost:8000',
      '/myprofile': 'http://localhost:8000',
      '/upload-photo': 'http://localhost:8000',
      '/forgot-password': 'http://localhost:8000',
      '/reset-password': 'http://localhost:8000',
      '/static': 'http://localhost:8000',
    }
  }
})
