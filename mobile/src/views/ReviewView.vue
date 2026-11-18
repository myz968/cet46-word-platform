<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { countPending, getDueTasks } from '../core/stats'
import { REVIEW_INTERVALS, MODE_EN2CN } from '../core/constants'
import { fromNow } from '../core/time'
import StatusBlock from '../components/StatusBlock.vue'

/**
 * 艾宾浩斯复习计划。
 *
 * 规则和桌面端一模一样：只有「答错过的词」才进复习队列，
 * 答对一次推进一个阶段，间隔依次 0 / 1 / 2 / 4 / 7 天；
 * 走完第 5 阶段就认为记住了，不再推送。任何阶段答错都会打回第 1 阶段。
 *
 * 这样设计的目的：不打扰。你没出错的词永远不会来烦你。
 */
const router = useRouter()

const loading = ref(true)
const due = ref([])
const pending = ref(0)
const mode = ref(MODE_EN2CN)

async function load() {
  loading.value = true
  const [list, p] = await Promise.all([getDueTasks(50), countPending()])
  due.value = list
  pending.value = p
  loading.value = false
}

onMounted(load)

function startReview() {
  if (!due.value.length) return
  router.push({
    path: '/quiz',
    query: { type: 'review', mode: mode.value, limit: Math.min(due.value.length, 20) }
  })
}

/** 阶段文案：第 n 阶段 / 5 */
function stageText(stage) {
  return `第 ${stage || 1} / ${REVIEW_INTERVALS.length} 阶段`
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">复习计划</h1>
        <p class="page-sub">按记忆曲线自动安排，到期的词才会出现在这里，不用你自己记时间。</p>
      </div>
    </div>

    <StatusBlock v-if="loading" type="loading" loading-text="检查今日复习…" />

    <template v-else>
      <!-- 今日概况 -->
      <div class="card hero">
        <div class="hero-row">
          <div>
            <div class="hero-num">{{ due.length }}</div>
            <div class="muted">个单词今天到期</div>
          </div>
          <div class="hero-arrow">→</div>
          <div class="hero-side">
            <div class="hero-side-num">{{ pending }}</div>
            <div class="muted">个在复习计划中</div>
          </div>
        </div>

        <div class="divider"></div>

        <div class="row-between">
          <span class="mode-label">复习模式</span>
          <div class="segment">
            <button
              type="button"
              class="segment-item"
              :class="{ active: mode === 'EN2CN' }"
              @click="mode = 'EN2CN'"
            >
              英译汉
            </button>
            <button
              type="button"
              class="segment-item"
              :class="{ active: mode === 'CN2EN' }"
              @click="mode = 'CN2EN'"
            >
              汉译英
            </button>
          </div>
        </div>

        <button
          class="btn btn-primary btn-block start-btn"
          type="button"
          :disabled="!due.length"
          @click="startReview"
        >
          {{ due.length ? `开始复习（${Math.min(due.length, 20)} 个）` : '今天没有到期的单词' }}
        </button>
      </div>

      <!-- 到期列表 -->
      <template v-if="due.length">
        <div class="section-title">今天要复习的词</div>
        <div class="due-list">
          <div v-for="item in due" :key="item.wordId" class="due-row">
            <div class="due-main">
              <div class="due-word">
                {{ item.word }}
                <span class="due-phonetic">{{ item.phonetic }}</span>
              </div>
              <div class="due-meaning">{{ item.meaning }}</div>
            </div>
            <div class="due-side">
              <span class="tag tag-warning">{{ stageText(item.stage) }}</span>
              <span class="due-time">{{ fromNow(item.dueTime) }}到期</span>
            </div>
          </div>
        </div>
      </template>

      <StatusBlock
        v-else-if="pending === 0"
        icon="🌱"
        title="复习队列还是空的"
        sub="去闯关吧，答错的词会自动进入复习计划"
      >
        <button class="btn btn-primary btn-sm" type="button" @click="router.push('/stage/1')">
          去闯关
        </button>
      </StatusBlock>

      <StatusBlock
        v-else
        icon="☕"
        title="今天的复习都做完了"
        :sub="`还有 ${pending} 个词在计划里，到期后会在这里提醒你`"
      />

      <!-- 规则说明：小白用户需要知道"为什么只让我复习这几个词" -->
      <div class="card rule-card">
        <div class="rule-title">复习是怎么安排的</div>
        <div class="rule-steps">
          <div class="rule-step">
            <span class="rule-dot">1</span>
            答错的词马上进复习计划，当天就要再看一遍
          </div>
          <div class="rule-step">
            <span class="rule-dot">2</span>
            之后每次复习答对，间隔就拉长：{{ REVIEW_INTERVALS.join(' / ') }} 天
          </div>
          <div class="rule-step">
            <span class="rule-dot">3</span>
            走完 5 轮就认为记住了，不再打扰你
          </div>
          <div class="rule-step">
            <span class="rule-dot">4</span>
            任何一轮答错，都从第 1 轮重新开始
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.hero {
  margin-bottom: 14px;
}

.hero-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.hero-num {
  font-size: 34px;
  font-weight: 700;
  color: var(--primary);
  line-height: 1.1;
}

.hero-arrow {
  color: #dcdfe6;
  font-size: 18px;
}

.hero-side-num {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-2);
  line-height: 1.2;
}

.mode-label {
  font-size: 13px;
  color: var(--text-2);
}

.segment {
  display: flex;
  background: #f2f3f5;
  border-radius: 9px;
  padding: 3px;
}

.segment-item {
  min-width: 68px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 7px;
  font-size: 13px;
  font-family: inherit;
  color: var(--text-2);
  cursor: pointer;
}

.segment-item.active {
  background: #fff;
  color: var(--primary);
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.start-btn {
  margin-top: 14px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-2);
  margin: 18px 2px 10px;
}

.due-list {
  background: #fff;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.due-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border-bottom: 1px solid #f5f7fa;
}

.due-row:last-child {
  border-bottom: none;
}

.due-main {
  flex: 1;
  min-width: 0;
}

.due-word {
  font-size: 16px;
  font-weight: 600;
  word-break: break-word;
}

.due-phonetic {
  font-size: 11px;
  color: var(--muted);
  font-weight: 400;
  margin-left: 6px;
}

.due-meaning {
  font-size: 13px;
  color: var(--text-2);
  margin-top: 2px;
}

.due-side {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.due-time {
  font-size: 11px;
  color: var(--muted);
}

.rule-card {
  margin-top: 18px;
  background: #fafcff;
  border: 1px solid var(--primary-border);
  box-shadow: none;
}

.rule-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-2);
  margin-bottom: 10px;
}

.rule-steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rule-step {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.55;
}

.rule-dot {
  flex: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
}
</style>
