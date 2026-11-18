import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/app.css'

/**
 * 移动端入口。
 *
 * 这里不引入任何 UI 组件库：Element Plus 是为桌面设计的，
 * 在手机上按钮偏小、弹窗偏宽，反而不好点。
 * 所以移动端用一套自己的轻量样式（配色、圆角、阴影与桌面端保持一致），
 * 打包后 JS 只有 100KB 左右（gzip 40KB），手机打开更快。
 */
createApp(App).use(router).mount('#app')

/**
 * 注册 Service Worker（PWA 离线能力）。
 *
 * 只在打包后的生产环境注册：开发时注册会导致改了代码刷新看不到效果（一直命中旧缓存）。
 * 失败也不影响正常使用，只是没有离线缓存而已，所以这里静默处理。
 *
 * 注册完成后还做两件事，都是为了"第一次打开就断网也能用"：
 *   1. 预取所有页面组件（路由是懒加载的，不预取的话断网点进去会白屏）
 *   2. 把已加载的静态资源地址发给 Service Worker 让它写进缓存
 */
async function setupPWA() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

  try {
    const reg = await navigator.serviceWorker.register('./sw.js')
    await navigator.serviceWorker.ready

    // 预取全部页面分包（都在本地，几十 KB，用户感知不到）
    await Promise.all([
      import('./views/WordsView.vue'),
      import('./views/StageListView.vue'),
      import('./views/QuizView.vue'),
      import('./views/WrongBookView.vue'),
      import('./views/ReviewView.vue'),
      import('./views/ReportView.vue')
    ]).catch(() => {})

    // 把当前页面已经加载过的 js/css/图片交给 SW 缓存
    const urls = performance
      .getEntriesByType('resource')
      .map((e) => e.name)
      .filter((u) => u.startsWith(location.origin) && /\.(js|css|png|svg)$/.test(u))

    const worker = reg.active || reg.waiting || reg.installing
    if (worker) worker.postMessage({ type: 'CACHE_URLS', urls })
  } catch (e) {
    // 常见原因：用局域网 IP 的 http 访问（浏览器只允许 https / localhost 注册 SW）
  }
}

if (document.readyState === 'complete') {
  setupPWA()
} else {
  window.addEventListener('load', setupPWA)
}
