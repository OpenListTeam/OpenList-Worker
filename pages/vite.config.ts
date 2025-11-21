import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../public',
    emptyOutDir: true
  },
  server: {
    port: 8086,
    proxy: {
      '/@mount': {
        target: 'http://localhost:8787',
        changeOrigin: true
      },
      '/@users': {
        target: 'http://localhost:8787',
        changeOrigin: true
      },
      '/@files': {
        target: 'http://localhost:8787',
        changeOrigin: true
      },
      '/@admin': {
        target: 'http://localhost:8787',
        changeOrigin: true
      },
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
