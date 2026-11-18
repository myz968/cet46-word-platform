<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getLast7Days, getLevelSummaries, getOverview, getRecentRecords } from '../core/stats'
import { clearLearningData } from '../core/progress'
import { clearWordCache, loadCatalog } from '../core/wordBank'
import { fromNow, mmss } from '../core/time'
import { LEVEL_NAMES, MODE_CN2EN } from '../core/constants'
import StatusBlock from '../components/StatusBlock.vue'

/**
 * 「我的」页 = 学习报告 + 数据管理。
 * 桌面端这个页面叫「我的」，里面同时放了学习报告和词库维护，这里保持一致，
 * 免得两个版本的操作路径不一样、用户换设备就找不到东西。
 */
const router = useRouter()

const loading = ref(true)
const overview = ref(null)
const week = ref([])
const records = ref([])
const levels = ref([])
const catalog = ref(null)
const clearing = ref(false)

async function load() {
  loading.value = true
  try {
    const [ov, w, r, lv, cat] = await Promise.all([
      getOverview(),
      getLast7Days(),
      getRecentRecords(5),
      getLevelSummaries(),
      loadCatalog()
    ])
    overview.value = ov
    week.value = w
    records.value = r
    levels.value = lv
    catalog.value = cat
  } finally {
    loading.value = false
  }
}

onMounted(load)

/** 柱状图最高值，用来算每根柱子的相对高度 */
const maxDaily = computed(() => Math.max(1, ...week.value.map((d) => d.total)))

function barHeight(item) {
  if (!item.total) return 2
  return Math.max(4, Math.round((item.total / maxDaily.value) * 56))
}

function percentText(v) {
  return Math.round((v || 0) * 100) + '%'
}

function modeText(mode) {
  return mode === MODE_CN2EN ? '汉译英' : '英译汉'
}

/** 清空学习记录：两步确认，避免手滑点掉整个月的进度 */
async function doClearLearning() {
  if (
    !window.confirm(
      '谨慎操作：会清空全部作答记录、错题本、复习计划和关卡进度，且无法恢复。词库不受影响。'
    )
  ) {
    return
  }
  if (!window.confirm('最后确认一次：学习数据删除后不可恢复，确定继续吗？')) return

  clearing.value = true
  try {
    await clearLearningData()
    await load()
    window.alert('已清空，可以从第一关重新开始')
  } finally {
    clearing.value = false
  }
}

/** 清空离线词库缓存：只删单词数据，不动学习记录，下次会自动重新下载 */
async function doClearWordCache() {
  if (!window.confirm('清空已缓存的词库？学习记录不受影响，下次进入关卡时会自动重新下载。')) return
  clearing.value = true
  try {
    await clearWordCache()
    await load()
    window.alert('词库缓存已清空')
  } finally {
    clearing.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">我的</h1>
        <p class="page-sub">所有数据都在这台手机上，不需要注册登录，也不会同步到任何服务器。</p>
      </div>
    </div>

    <StatusBlock v-if="loading" type="loading" loading-text="统计中…" />

    <template v-else-if="overview">
      <!-- 关键四数 -->
      <div class="card">
        <div class="grid-4">
          <div class="cell">
            <div class="cell-num">{{ overview.learnedWords }}</div>
            <div class="cell-label">累计学词</div>
          </div>
          <div class="cell">
            <div class="cell-num">{{ overview.totalAnswers }}</div>
            <div class="cell-label">总作答</div>
          </div>
          <div class="cell">
            <div class="cell-num">{{ percentText(overview.accuracy) }}</div>
            <div class="cell-label">正确率</div>
          </div>
          <div class="cell">
            <div class="cell-num">{{ overview.passedStages }}</div>
            <div class="cell-label">已通关</div>
          </div>
        </div>

        <div class="divider"></div>

        <div class="mini-row">
          <span class="muted">错题本待掌握</span>
          <span class="mini-value danger">{{ overview.wrongCount }}</span>
        </div>
        <div class="mini-row">
          <span class="muted">复习计划中</span>
          <span class="mini-value">{{ overview.pendingReview }}</span>
        </div>
        <div class="mini-row">
          <span class="muted">今日学词</span>
          <span class="mini-value">{{ overview.todayLearned }}</span>
        </div>
      </div>

      <!-- 最近 7 天 -->
      <div class="card">
        <div class="card-head">
          <span class="card-title">最近 7 天</span>
          <span class="muted">共 {{ week.reduce((s, d) => s + d.total, 0) }} 次作答</span>
        </div>

        <div class="chart">
          <div v-for="d in week" :key="d.date" class="chart-col">
            <div class="chart-num">{{ d.total || '' }}</div>
            <div class="chart-bar" :style="{ height: barHeight(d) + 'px' }"></div>
            <div class="chart-label">{{ d.label }}</div>
          </div>
        </div>
      </div>

      <!-- 各难度进度 -->
      <div class="card">
        <div class="card-head">
          <span class="card-title">各难度进度</span>
        </div>
        <div v-for="lv in levels" :key="lv.level" class="lv-row">
          <div class="lv-name">{{ lv.levelName }}</div>
          <div class="lv-bar progress">
            <div
              class="progress-bar"
              :style="{ width: (lv.stageCount ? (lv.passedCount / lv.stageCount) * 100 : 0) + '%' }"
            ></div>
          </div>
          <div class="lv-text">{{ lv.passedCount }}/{{ lv.stageCount }}</div>
        </div>
      </div>

      <!-- 最近闯关记录 -->
      <div class="card">
        <div class="card-head">
          <span class="card-title">最近闯关</span>
          <span class="muted" @click="router.push('/stage/1')">去闯关 ›</span>
        </div>

        <div v-if="!records.length" class="muted" style="padding: 8px 0">还没有闯关记录，去试试第一关吧</div>

        <div v-for="(r, i) in records" :key="i" class="rec-row">
          <div class="rec-main">
            <div class="rec-title">
              {{ LEVEL_NAMES[r.freqLevel] }} · 第 {{ r.stageNo }} 关
              <span class="tag tag-primary">{{ modeText(r.mode) }}</span>
            </div>
            <div class="rec-sub">
              {{ fromNow(r.createTime) }} · 用时 {{ mmss(r.durationSec) }} · 新增生词
              {{ r.newWordCount }}
            </div>
          </div>
          <div class="rec-acc" :class="{ bad: r.accuracy < 0.6 }">
            {{ percentText(r.accuracy) }}
          </div>
        </div>
      </div>

      <!-- 词库信息 -->
      <div class="card">
        <div class="card-head">
          <span class="card-title">词库</span>
          <span class="muted">{{ catalog ? catalog.total : 0 }} 词 · 离线内置</span>
        </div>
        <div v-for="lv in levels" :key="lv.level" class="lv-row">
          <div class="lv-name">{{ lv.levelName }}</div>
          <div class="lv-bar progress">
            <div class="progress-bar" :style="{ width: (lv.count / (catalog ? catalog.total : 1)) * 100 + '%' }"></div>
          </div>
          <div class="lv-text">{{ lv.count }} 词</div>
        </div>
        <p class="muted" style="margin: 10px 0 0; line-height: 1.6">
          词库随网页一起打包，打开就能用，不联网也能背；进入某个难度时才下载那一份，下过就存在手机里。
        </p>
      </div>

      <!-- 数据管理 -->
      <div class="card">
        <div class="card-head">
          <span class="card-title">数据管理</span>
        </div>

        <button class="btn btn-ghost btn-block" type="button" :disabled="clearing" @click="doClearWordCache">
          清空已缓存词库
        </button>
        <button
          class="btn btn-danger-plain btn-block"
          type="button"
          style="margin-top: 10px"
          :disabled="clearing"
          @click="doClearLearning"
        >
          清空学习记录
        </button>

        <p class="muted" style="margin: 12px 0 0; line-height: 1.6">
          清空学习记录会同时清掉作答记录、错题本、复习计划和关卡进度，且无法恢复。
          如果只是想换手机，直接把网址记下来在新手机上重新学即可（两个版本数据互相独立）。
        </p>
      </div>

      <p class="foot-note">
        桌面版（Windows 安装包）与手机版是两套独立数据，互不影响。<br />
        手机版更适合碎片时间刷词，桌面版适合坐下来一口气过整关。
      </p>
    </template>
  </div>
</template>

<style scoped>
.grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.cell {
  text-align: center;
}

.cell-num {
  font-size: 19px;
  font-weight: 700;
  color: var(--primary);
  line-height: 1.25;
}

.cell-label {
  font-size: 11px;
  color: var(--muted);
  margin-top: 2px;
}

.mini-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 0;
}

.mini-value {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-2);
}

.mini-value.danger {
  color: var(--danger);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
}

/* 7 天柱状图：纯 CSS，不引入图表库 */
.chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 6px;
  height: 100px;
  padding-top: 6px;
}

.chart-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  height: 100%;
}

.chart-num {
  font-size: 10px;
  color: var(--muted);
  height: 12px;
  font-variant-numeric: tabular-nums;
}

.chart-bar {
  width: 100%;
  max-width: 26px;
  border-radius: 4px 4px 2px 2px;
  background: linear-gradient(180deg, #79bbff, #409eff);
  transition: height 0.25s;
}

.chart-label {
  font-size: 10px;
  color: var(--muted);
}

.lv-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
}

.lv-name {
  flex: none;
  width: 64px;
  font-size: 12px;
  color: var(--text-2);
}

.lv-bar {
  flex: 1;
}

.lv-text {
  flex: none;
  width: 52px;
  text-align: right;
  font-size: 11px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.rec-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #f5f7fa;
}

.rec-row:last-child {
  border-bottom: none;
}

.rec-main {
  flex: 1;
  min-width: 0;
}

.rec-title {
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.rec-sub {
  font-size: 11px;
  color: var(--muted);
  margin-top: 3px;
}

.rec-acc {
  font-size: 16px;
  font-weight: 600;
  color: var(--success);
  font-variant-numeric: tabular-nums;
}

.rec-acc.bad {
  color: var(--warning);
}

.foot-note {
  font-size: 12px;
  color: var(--muted);
  text-align: center;
  margin: 20px 10px 0;
  line-height: 1.7;
}
</style>
