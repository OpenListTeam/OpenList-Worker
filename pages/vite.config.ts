import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@api': path.resolve(__dirname, 'src/api'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@layouts': path.resolve(__dirname, 'src/layouts'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@store': path.resolve(__dirname, 'src/store'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@theme': path.resolve(__dirname, 'src/theme'),
      // ============================================================
      // dev-media 媒体库联调占位（默认禁用）
      // 当需要本地联调媒体库（dev-media）时，取消下一行的注释。
      // '@media': path.resolve(__dirname, '../dev-media/src'),
      // ============================================================
    },
  },
  build: {
    // 与外层 wrangler 部署对齐：构建产物输出到 ../public
    // 详见 OpenList-TSWorker 根目录 wrangler.jsonc 中 assets.directory
    outDir: '../public',
    emptyOutDir: true,
  },
  server: {
    host: '127.0.0.1',
    port: 5175,
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
    },
  },
})
