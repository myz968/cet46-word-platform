<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiReviewToday } from '../api'

/**
 * 艾宾浩斯复习页：展示今天到期的单词，并可一键进入复习答题。
 * 复习答对 -> 推进到下一记忆阶段（间隔变长）；答错 -> 打回第 1 阶段（当天再来）。
 */
const router = useRouter()

const list = ref([])
const total = ref(0)
const pending = ref(0)
const loading = ref(true)
const mode = ref('EN2CN')

async function load() {
  loading.value = true
  try {
    const data = await apiReviewToday()
    list.value = data.list
    total.value = data.total
    pending.value = data.pending
  } finally {
    loading.value = false
  }
}

onMounted(load)

function startReview() {
  router.push({ path: '/quiz', query: { type: 'review', mode: mode.value, limit: 20 } })
}

/** 记忆阶段 1~5 对应 0/1/2/4/7 天的间隔 */
function stageText(stage) {
  const map = { 1: '第 1 轮', 2: '第 2 轮', 3: '第 3 轮', 4: '第 4 轮', 5: '第 5 轮' }
  return map[stage] || `第 ${stage} 轮`
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">今日复习</h1>
    <p class="page-sub">按记忆曲线推送：答错后当天复习，之后间隔 1 / 2 / 4 / 7 天逐步拉长。</p>

    <div class="card toolbar">
      <div class="row">
        <span class="label">答题模式</span>
        <el-radio-group v-model="mode" size="small">
          <el-radio-button value="EN2CN">英译汉</el-radio-button>
          <el-radio-button value="CN2EN">汉译英</el-radio-button>
        </el-radio-group>
        <div class="spacer"></div>
        <span class="muted">到期 {{ total }} 个 · 计划中 {{ pending }} 个</span>
        <el-button type="primary" :disabled="total === 0" @click="startReview">开始复习</el-button>
      </div>
    </div>

    <div v-loading="loading" class="card" style="margin-top: 14px">
      <el-empty
        v-if="!loading && list.length === 0"
        :description="pending > 0 ? '今天没有到期的单词，明天再来（计划中还有 ' + pending + ' 个）' : '还没有复习任务，先去闯关吧'"
      />

      <template v-else>
        <div class="review-row" v-for="item in list" :key="item.id">
          <div class="word-col">
            <div class="word">{{ item.word }}</div>
            <div class="phonetic">{{ item.phonetic }}</div>
          </div>
          <div class="meaning-col">{{ item.meaning }}</div>
          <el-tag size="small" effect="plain">{{ stageText(item.stage) }}</el-tag>
          <span class="muted time">到期 {{ item.dueTime }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  padding: 14px 18px;
}

.label {
  font-size: 13px;
  color: #606266;
  font-weight: 600;
}

.review-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 4px;
  border-bottom: 1px solid #f5f7fa;
}

.word-col {
  min-width: 130px;
}

.word {
  font-size: 16px;
  font-weight: 600;
}

.phonetic {
  font-size: 12px;
  color: #909399;
}

.meaning-col {
  flex: 1;
  font-size: 14px;
  color: #606266;
}

.time {
  font-size: 11px;
  white-space: nowrap;
}
</style>
