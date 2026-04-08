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
    host: '127.0.0.1',
    port: 1089,
    proxy: {
      // 新版 /api/* 路由代理（与 Worker 后端对齐，不去掉前缀）
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      // 直接下载 / 代理下载
      '/d/': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/p/': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      // 分享下载
      '/sd/': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      // WebDAV
      '/dav/': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      // 系统初始化路由
      '/@setup': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      // ping 健康检查
      '/ping': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    }
  }
})
