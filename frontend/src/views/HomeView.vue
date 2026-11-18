<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiLevels, apiReviewToday } from '../api'
import { userState } from '../store/user'

const router = useRouter()
const levels = ref([])
const reviewTotal = ref(0)
const pending = ref(0)
const loading = ref(true)

/** 首页只做两件事：展示三个难度的进度、提示今天该复习多少词 */
async function loadData() {
  loading.value = true
  try {
    levels.value = await apiLevels()
    const rv = await apiReviewToday()
    reviewTotal.value = rv.total
    pending.value = rv.pending
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

/** 该难度的闯关进度（已通关关数 / 总关数） */
function progress(level) {
  if (!level.stageCount) return 0
  return Math.round((level.passedCount / level.stageCount) * 100)
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">你好，{{ userState.nickname }}</h1>
    <p class="page-sub">按考频从易到难，一关一关背单词。答错的词会自动进错题本并安排复习。</p>

    <!-- 复习提醒 -->
    <div class="review-tip" v-if="reviewTotal > 0" @click="router.push('/review')">
      <div>
        <div class="tip-title">今天有 {{ reviewTotal }} 个单词到期待复习</div>
        <div class="tip-sub">按记忆曲线安排，复习一遍记得更牢</div>
      </div>
      <el-button type="primary" plain>去复习</el-button>
    </div>
    <div class="review-tip quiet" v-else-if="pending > 0">
      <div>
        <div class="tip-title">暂无到期复习</div>
        <div class="tip-sub">还有 {{ pending }} 个单词在复习计划中，到期后会自动提醒</div>
      </div>
    </div>

    <div v-loading="loading">
      <div class="level-grid">
        <div v-for="lv in levels" :key="lv.freqLevel" class="level-card">
          <div class="level-head">
            <span class="level-name">{{ lv.levelName }}</span>
            <el-tag size="small" type="info" effect="plain">第 {{ lv.freqLevel }} 级</el-tag>
          </div>
          <p class="level-desc">{{ lv.description }}</p>

          <div class="level-meta">
            <span>{{ lv.totalWords }} 词</span>
            <span class="dot">·</span>
            <span>{{ lv.stageCount }} 关</span>
            <span class="dot">·</span>
            <span>每关 {{ lv.levelSize }} 词</span>
          </div>

          <el-progress :percentage="progress(lv)" :stroke-width="6" :show-text="false" />
          <div class="level-foot">
            <span class="muted">已通关 {{ lv.passedCount }} / {{ lv.stageCount }}</span>
            <el-button type="primary" size="small" @click="router.push(`/stage/${lv.freqLevel}`)">
              {{ lv.passedCount > 0 ? '继续闯关' : '开始闯关' }}
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <div class="quick-row">
      <div class="quick-card" @click="router.push('/wrong-book')">
        <div class="quick-title">错题本</div>
        <div class="quick-sub">查看并重练答错的单词</div>
      </div>
      <div class="quick-card" @click="router.push('/review')">
        <div class="quick-title">今日复习</div>
        <div class="quick-sub">按记忆曲线巩固旧词</div>
      </div>
      <div class="quick-card" @click="router.push('/profile')">
        <div class="quick-title">学习报告</div>
        <div class="quick-sub">正确率、用时、新增生词</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.review-tip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-radius: 10px;
  background: linear-gradient(90deg, #ecf5ff, #f4f9ff);
  border: 1px solid #d9ecff;
  margin-bottom: 18px;
  cursor: pointer;
}

.review-tip.quiet {
  background: #fafafa;
  border-color: #ebeef5;
  cursor: default;
}

.tip-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.tip-sub {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.level-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}

.level-card {
  background: #fff;
  border-radius: 12px;
  padding: 18px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.level-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.level-name {
  font-size: 17px;
  font-weight: 600;
}

.level-desc {
  margin: 0;
  font-size: 13px;
  color: #909399;
  line-height: 1.6;
  min-height: 42px;
}

.level-meta {
  font-size: 12px;
  color: #606266;
}

.dot {
  margin: 0 6px;
  color: #c0c4cc;
}

.level-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.quick-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.quick-card {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s;
}

.quick-card:hover {
  border-color: #d9ecff;
  transform: translateY(-1px);
}

.quick-title {
  font-size: 14px;
  font-weight: 600;
}

.quick-sub {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>
