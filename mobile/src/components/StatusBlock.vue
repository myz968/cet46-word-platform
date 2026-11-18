<script setup>
/**
 * 空状态 / 加载中 的统一组件。
 * 手机上留白本来就少，状态提示必须统一，否则每个页面各写一套会显得乱。
 */
defineProps({
  /** 'empty' | 'loading' */
  type: { type: String, default: 'empty' },
  icon: { type: String, default: '📭' },
  title: { type: String, default: '这里还是空的' },
  sub: { type: String, default: '' },
  loadingText: { type: String, default: '加载中…' }
})
</script>

<template>
  <div v-if="type === 'loading'" class="loading-box">
    <div class="spinner"></div>
    <div>{{ loadingText }}</div>
  </div>

  <div v-else class="empty">
    <div class="empty-icon">{{ icon }}</div>
    <div class="empty-title">{{ title }}</div>
    <div v-if="sub" class="empty-sub">{{ sub }}</div>
    <slot />
  </div>
</template>
