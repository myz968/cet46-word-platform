import { createRouter, createWebHashHistory } from 'vue-router'

/**
 * 路由表。
 *
 * 用 hash 模式（地址带 #）的原因：
 *   1. 静态托管到任何地方都不用配服务端 rewrite，nginx/宝塔/本地 node 直接能跑；
 *   2. 以后想用 file:// 直接打开 dist 也能用，和桌面端保持同一套思路。
 */
const routes = [
  { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
  { path: '/words', name: 'words', component: () => import('../views/WordsView.vue') },
  { path: '/stage/:freqLevel', name: 'stage', component: () => import('../views/StageListView.vue') },
  {
    path: '/quiz',
    name: 'quiz',
    component: () => import('../views/QuizView.vue'),
    meta: { hideTab: true }
  },
  { path: '/wrong-book', name: 'wrongBook', component: () => import('../views/WrongBookView.vue') },
  { path: '/review', name: 'review', component: () => import('../views/ReviewView.vue') },
  { path: '/report', name: 'report', component: () => import('../views/ReportView.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

export default router
