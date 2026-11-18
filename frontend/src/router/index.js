import { createRouter, createWebHashHistory } from 'vue-router'

/**
 * 路由表。
 *
 * 这里用 hash 模式（地址里带 #），原因：Electron 打包后用 file:// 协议加载页面，
 * history 模式刷新会 404，hash 模式不需要服务端配合，最稳。
 */
const routes = [
  { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
  { path: '/stage/:freqLevel', name: 'stageList', component: () => import('../views/StageListView.vue') },
  { path: '/quiz', name: 'quiz', component: () => import('../views/QuizView.vue') },
  { path: '/wrong-book', name: 'wrongBook', component: () => import('../views/WrongBookView.vue') },
  { path: '/review', name: 'review', component: () => import('../views/ReviewView.vue') },
  { path: '/profile', name: 'profile', component: () => import('../views/ProfileView.vue') },
  { path: '/login', name: 'login', component: () => import('../views/LoginView.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})
