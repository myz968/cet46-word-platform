<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { userState } from './store/user'

const route = useRoute()
const router = useRouter()

// 答题页与登录页不显示顶部导航，避免干扰
const hideNav = computed(() => ['quiz', 'login'].includes(route.name))
const active = computed(() => route.path)

const navs = [
  { path: '/', label: '闯关' },
  { path: '/wrong-book', label: '错题本' },
  { path: '/review', label: '复习' },
  { path: '/profile', label: '我的' }
]
</script>

<template>
  <div class="app-shell">
    <header v-if="!hideNav" class="topbar">
      <div class="brand" @click="router.push('/')">
        <span class="logo">CET</span>
        <span class="brand-text">四六级单词闯关</span>
      </div>

      <nav class="navs">
        <div
          v-for="item in navs"
          :key="item.path"
          class="nav-item"
          :class="{ active: active === item.path }"
          @click="router.push(item.path)"
        >
          {{ item.label }}
        </div>
      </nav>

      <div class="user" @click="router.push('/profile')">
        {{ userState.nickname || '加载中' }}
        <span v-if="userState.isGuest" class="tag">游客</span>
      </div>
    </header>

    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 24px;
  height: 56px;
  padding: 0 20px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  position: sticky;
  top: 0;
  z-index: 10;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: #409eff;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.brand-text {
  font-size: 15px;
  font-weight: 600;
}

.navs {
  display: flex;
  gap: 4px;
  flex: 1;
}

.nav-item {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
  user-select: none;
}

.nav-item:hover {
  background: #f2f6fc;
  color: #409eff;
}

.nav-item.active {
  background: #ecf5ff;
  color: #409eff;
  font-weight: 600;
}

.user {
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tag {
  font-size: 11px;
  color: #e6a23c;
  background: #fdf6ec;
  border-radius: 4px;
  padding: 1px 5px;
}

.content {
  flex: 1;
}
</style>
