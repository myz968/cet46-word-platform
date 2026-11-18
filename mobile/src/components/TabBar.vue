<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/**
 * 底部导航。
 *
 * 图标用内联 SVG（描边风格），好处：
 *   - 不用装图标库，省体积；
 *   - 任何分辨率都清晰，不受 emoji 在不同手机上长得不一样的影响。
 * 5 个入口正好覆盖「闯关 / 词库 / 错题 / 复习 / 报告」五件事。
 */
const route = useRoute()
const router = useRouter()

const tabs = [
  { name: 'home', path: '/', label: '首页', icon: 'M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5' },
  { name: 'words', path: '/words', label: '词库', icon: 'M4 4h7v16H4zM13 4h7v16h-7z' },
  { name: 'wrongBook', path: '/wrong-book', label: '错题本', icon: 'M6 3h12v18l-6-3.5L6 21z' },
  { name: 'review', path: '/review', label: '复习', icon: 'M12 7v5l3.5 2M21 12a9 9 0 1 1-9-9' },
  { name: 'report', path: '/report', label: '我的', icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2' }
]

const active = computed(() => route.name)

function go(tab) {
  if (route.name === tab.name) return
  router.push(tab.path)
}
</script>

<template>
  <nav class="tabbar">
    <button
      v-for="tab in tabs"
      :key="tab.name"
      class="tabbar-item"
      :class="{ active: active === tab.name }"
      type="button"
      @click="go(tab)"
    >
      <svg
        class="tabbar-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path :d="tab.icon" />
      </svg>
      <span>{{ tab.label }}</span>
    </button>
  </nav>
</template>
