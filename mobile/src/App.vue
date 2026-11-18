<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TabBar from './components/TabBar.vue'

/**
 * 应用外壳：内容区 + 底部导航。
 * 答题页是全屏沉浸式的（屏幕本来就小，再压一条导航栏会挡住选项），
 * 所以通过路由 meta.hideTab 把它隐藏掉。
 */
const route = useRoute()
const showTab = computed(() => !route.meta.hideTab)
</script>

<template>
  <div class="app-shell">
    <router-view />
    <TabBar v-if="showTab" />
  </div>
</template>
