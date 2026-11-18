<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { countDue, getLevelSummaries, getOverview, passPercent } from '../core/stats'
import { loadCatalog } from '../core/wordBank'
import { LOCAL_NICKNAME } from '../core/constants'
import StatusBlock from '../components/StatusBlock.vue'

/**
 * 首页：三档难度进度 + 今日复习提醒 + 快捷入口。
 *
 * 操作路径只有一条：点难度 → 选关卡 → 答题。小学生也能一眼看懂，
 * 所以第一屏不放任何需要理解的功能（设置、导出之类都收在「我的」里）。
 */
const router = useRouter()

const loading = ref(true)
const error = ref('')
const levels = ref([])
const dueCount = ref(0)
const overview = ref(null)
const totalWords = ref(0)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [catalog, list, due, ov] = await Promise.all([
      loadCatalog(),
      getLevelSummaries(),
      countDue(),
      getOverview()
    ])
    levels.value = list
    dueCount.value = due
    overview.value = ov
    totalWords.value = catalog.total
  } catch (e) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)

/** 时间问候语，让页面不那么干巴巴 */
function greeting() {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}
</script>

<template>
  <div class="page">
    <StatusBlock v-if="loading" type="loading" loading-text="正在准备词库…" />

    <StatusBlock
      v-else-if="error"
      icon="⚠️"
      title="没能加载词库"
      :sub="error"
    >
      <button class="btn btn-primary btn-sm" @click="load">重新加载</button>
    </StatusBlock>

    <template v-else>
      <div class="page-head">
        <div>
          <h1 class="page-title">{{ greeting() }}，{{ LOCAL_NICKNAME }}</h1>
          <p class="page-sub">按考频从易到难，一关一关背。答错的词自动进错题本并安排复习。</p>
        </div>
      </div>

      <!-- 今日概况：三个数字，一眼看完 -->
      <div class="stat-strip">
        <div class="stat-cell">
          <div class="stat-num">{{ overview.todayLearned }}</div>
          <div class="stat-label">今日学词</div>
        </div>
        <div class="stat-cell">
          <div class="stat-num">{{ overview.learnedWords }}</div>
          <div class="stat-label">累计学词</div>
        </div>
        <div class="stat-cell">
          <div class="stat-num">{{ dueCount }}</div>
          <div class="stat-label">待复习</div>
        </div>
      </div>

      <!-- 复习提醒：有到期的才显示大卡片 -->
      <div v-if="dueCount > 0" class="review-tip" @click="router.push('/review')">
        <div>
          <div class="tip-title">今天有 {{ dueCount }} 个单词该复习了</div>
          <div class="tip-sub">按记忆曲线安排，趁没忘再巩固一遍</div>
        </div>
        <span class="btn btn-primary btn-sm">去复习</span>
      </div>

      <!-- 三档难度 -->
      <div class="section-title">选择难度</div>

      <div
        v-for="lv in levels"
        :key="lv.level"
        class="level-card"
        @click="router.push(`/stage/${lv.level}`)"
      >
        <div class="level-head">
          <div class="level-name">
            <span class="level-index" :class="`idx-${lv.level}`">{{ lv.level }}</span>
            {{ lv.levelName }}
          </div>
          <span class="tag" :class="lv.passedCount > 0 ? 'tag-success' : ''">
            {{ lv.passedCount > 0 ? `已通关 ${lv.passedCount}/${lv.stageCount}` : '未开始' }}
          </span>
        </div>

        <p class="level-desc">{{ lv.description }}</p>

        <div class="progress">
          <div class="progress-bar" :style="{ width: passPercent(lv.passedCount, lv.stageCount) + '%' }"></div>
        </div>

        <div class="level-meta">
          <span>{{ lv.count }} 词</span>
          <span class="dot">·</span>
          <span>{{ lv.stageCount }} 关</span>
          <span class="dot">·</span>
          <span>每关 20 词</span>
          <span class="spacer"></span>
          <span class="level-go">开始闯关 ›</span>
        </div>
      </div>

      <!-- 快捷入口 -->
      <div class="section-title">快捷入口</div>
      <div class="quick-grid">
        <div class="quick-card" @click="router.push('/wrong-book')">
          <div class="quick-icon">📕</div>
          <div class="quick-title">错题本</div>
          <div class="quick-sub">{{ overview.wrongCount }} 个待掌握</div>
        </div>
        <div class="quick-card" @click="router.push('/review')">
          <div class="quick-icon">🔁</div>
          <div class="quick-title">复习计划</div>
          <div class="quick-sub">{{ overview.pendingReview }} 个在计划中</div>
        </div>
        <div class="quick-card" @click="router.push('/words')">
          <div class="quick-icon">📖</div>
          <div class="quick-title">词库</div>
          <div class="quick-sub">{{ totalWords }} 词分级查看</div>
        </div>
        <div class="quick-card" @click="router.push('/report')">
          <div class="quick-icon">📊</div>
          <div class="quick-title">学习报告</div>
          <div class="quick-sub">正确率与进步曲线</div>
        </div>
      </div>

      <p class="foot-note">
        本页面所有数据都保存在你自己的手机浏览器里，不联网也能用，不会上传任何信息。
      </p>
    </template>
  </div>
</template>

<style scoped>
/* 顶部三格数据 */
.stat-strip {
  display: flex;
  background: #fff;
  border-radius: var(--radius);
  padding: 14px 6px;
  box-shadow: var(--shadow);
  margin-bottom: 14px;
}

.stat-cell {
  flex: 1;
  text-align: center;
  position: relative;
}

.stat-cell + .stat-cell::before {
  content: "";
  position: absolute;
  left: 0;
  top: 15%;
  height: 70%;
  width: 1px;
  background: var(--border);
}

.stat-num {
  font-size: 20px;
  font-weight: 600;
  color: var(--primary);
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
}

/* 复习提醒 */
.review-tip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px;
  border-radius: var(--radius);
  background: linear-gradient(90deg, #ecf5ff, #f4f9ff);
  border: 1px solid var(--primary-border);
  margin-bottom: 14px;
}

.tip-title {
  font-size: 15px;
  font-weight: 600;
}

.tip-sub {
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-2);
  margin: 18px 2px 10px;
}

/* 难度卡片 */
.level-card {
  background: #fff;
  border-radius: var(--radius);
  padding: 16px;
  box-shadow: var(--shadow);
  margin-bottom: 12px;
}

.level-card:active {
  background: #fafcff;
}

.level-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}

.level-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
}

/* 级别小圆标：1 蓝 2 橙 3 紫，做题时也能一眼区分 */
.level-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  font-size: 12px;
  color: #fff;
  background: var(--primary);
}

.level-index.idx-2 {
  background: var(--warning);
}

.level-index.idx-3 {
  background: #8e6bd9;
}

.level-desc {
  font-size: 13px;
  color: var(--muted);
  margin: 0 0 12px;
}

.level-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--muted);
  margin-top: 10px;
}

.dot {
  color: #dcdfe6;
}

.level-go {
  color: var(--primary);
  font-weight: 500;
}

/* 快捷入口 2×2 */
.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.quick-card {
  background: #fff;
  border-radius: var(--radius);
  padding: 14px;
  box-shadow: var(--shadow);
}

.quick-card:active {
  background: #fafcff;
}

.quick-icon {
  font-size: 20px;
  line-height: 1;
  margin-bottom: 8px;
}

.quick-title {
  font-size: 15px;
  font-weight: 600;
}

.quick-sub {
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
}

.foot-note {
  font-size: 12px;
  color: var(--muted);
  text-align: center;
  margin: 22px 10px 0;
  line-height: 1.6;
}
</style>
