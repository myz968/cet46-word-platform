import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * Vite 配置
 * - base: './' 必须保留：Electron 打包后用 file:// 协议加载 index.html，
 *   绝对路径 /assets/xxx.js 会找不到文件，相对路径才能正常加载
 * - server.proxy: 开发阶段前端 5173 端口，把 /api 请求转发到后端 8080，避免跨域
 */
export default defineConfig({
  base: './',
  plugins: [vue()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 1500
  }
})
