import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * 移动端 H5 构建配置。
 *
 * 几个关键点：
 * 1. base: './'  产物用相对路径引用资源。这样把 dist 丢到任意目录/子路径、
 *    甚至用 file:// 直接打开都能跑（和桌面端 Electron 打包用的是同一套思路）。
 * 2. 端口 5174   刻意和桌面端的 5173 错开，两个项目可以同时开着不打架。
 * 3. host: true  允许手机用「电脑局域网 IP:5174」访问，方便真机调试。
 * 4. 没有 /api 代理  移动端是纯本地离线版，不发任何后端请求，所以不需要 proxy。
 */
export default defineConfig({
  plugins: [vue()],
  base: './',
  server: {
    port: 5174,
    host: true,
    strictPort: false
  },
  preview: {
    port: 4174,
    host: true
  },
  build: {
    outDir: 'dist',
    // 词库 JSON 走 public 目录直接拷贝，不参与打包体积告警判断
    chunkSizeWarningLimit: 1200
  }
})
