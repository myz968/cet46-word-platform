import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

import App from './App.vue'
import router from './router'
import { ensureLogin } from './store/user'
import './assets/style.css'

/**
 * 应用启动流程：
 * 1. 先确保有登录态（没有 token 就自动申请一个游客账号）
 * 2. 再挂载应用，避免首屏页面拿到空白用户信息后闪一下
 */
async function bootstrap() {
  try {
    await ensureLogin()
  } catch (e) {
    // 后端没起来时也要让页面渲染出来，页面内的接口会给出具体错误提示
    console.error('初始化登录态失败：', e)
  }

  const app = createApp(App)
  app.use(ElementPlus, { locale: zhCn })
  app.use(router)
  app.mount('#app')
}

bootstrap()
