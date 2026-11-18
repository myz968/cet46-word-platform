<script setup>
import { computed, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { buildQuestions, isSpellingCorrect, shuffle } from '../core/quiz'
import { ensureLevel } from '../core/wordBank'
import { getDueTasks, getWrongPage } from '../core/stats'
import { submitReview, submitStage, submitWrongPractice } from '../core/progress'
import { LEVEL_NAMES, LEVEL_SIZE, MODE_CN2EN, PASS_ACCURACY } from '../core/constants'
import { mmss } from '../core/time'
import StatusBlock from '../components/StatusBlock.vue'

/**
 * 答题页（闯关 / 错题重练 / 艾宾浩斯复习 三种来源共用）。
 *
 * 地址参数区分来源：
 *   /quiz?type=stage&level=1&stageNo=3&mode=EN2CN   闯关，交卷后出学习报告
 *   /quiz?type=wrong&mode=EN2CN&limit=20            错题重练，答对即移出错题本
 *   /quiz?type=review&mode=CN2EN&limit=20           今日复习，按记忆曲线推进阶段
 *
 * 交互上刻意少放东西：一屏只有「题干 + 选项」，答对自动跳下一题，
 * 答错停下来让用户看清正确答案和例句 —— 手机上如果按钮太多，反而容易点错。
 */
const route = useRoute()
const router = useRouter()

const type = route.query.type || 'stage'
const freqLevel = Number(route.query.level || 1)
const stageNo = Number(route.query.stageNo || 1)
const mode = route.query.mode === MODE_CN2EN ? MODE_CN2EN : 'EN2CN'
const limit = Number(route.query.limit || LEVEL_SIZE)
const stageCount = Number(route.query.stageCount || 0)

const loading = ref(true)
const loadingText = ref('准备题目…')
const errorMsg = ref('')
const questions = ref([])
const index = ref(0)
const answers = ref([])
const feedback = ref(null)
const typed = ref('')
const elapsed = ref(0)
const finished = ref(false)
const report = ref(null)
const submitting = ref(false)

let timer = null
let startedAt = 0
let autoNextTimer = null
/** 记录"已经为第几题推进过了"，防止自动跳转和手动点下一题重复执行跳两题 */
let advancedFor = -1

const current = computed(() => questions.value[index.value] || null)
const total = computed(() => questions.value.length)
const progressPercent = computed(() => (total.value ? Math.round((index.value / total.value) * 100) : 0))
const timeText = computed(() => mmss(elapsed.value))

/** 结果页大标题 */
const resultTitle = computed(() => {
  if (type === 'wrong') return '错题重练完成'
  if (type === 'review') return '今日复习完成'
  return report.value && report.value.passed ? '通关成功' : '本关完成'
})

/** 把错题记录（错题本/复习任务里的快照）还原成出题用的单词结构 */
function toWord(row) {
  return {
    id: row.wordId,
    word: row.word,
    phonetic: row.phonetic,
    meaning: row.meaning,
    example: row.example,
    freqLevel: row.freqLevel
  }
}

/** 干扰项池：优先用同难度完整词库，取不到就退回本批单词自己 */
async function buildPool(words) {
  const levels = [...new Set(words.map((w) => w.freqLevel).filter(Boolean))]
  const pool = []
  for (const lv of levels) {
    try {
      pool.push(...(await ensureLevel(lv)))
    } catch (e) {
      // 某一级没缓存也继续，用已有词凑选项
    }
  }
  return pool.length >= 4 ? pool : words
}

async function loadQuestions() {
  loading.value = true
  errorMsg.value = ''
  finished.value = false
  report.value = null
  feedback.value = null
  typed.value = ''
  answers.value = []
  index.value = 0
  elapsed.value = 0
  advancedFor = -1

  try {
    let words = []

    if (type === 'stage') {
      const pool = await ensureLevel(freqLevel, (text) => {
        loadingText.value = text
      })
      words = pool.slice((stageNo - 1) * LEVEL_SIZE, stageNo * LEVEL_SIZE)
      if (!words.length) throw new Error('这一关还没有单词，请检查词库是否完整')
      questions.value = buildQuestions(words, mode, pool)
    } else if (type === 'wrong') {
      loadingText.value = '加载错题本…'
      const page = await getWrongPage(1, 200)
      const picked = shuffle(page.list).slice(0, limit)
      if (!picked.length) throw new Error('错题本还是空的，先去闯关吧')
      const list = picked.map(toWord)
      questions.value = buildQuestions(list, mode, await buildPool(list))
    } else {
      loadingText.value = '加载今日复习…'
      const tasks = await getDueTasks(limit)
      if (!tasks.length) throw new Error('今天没有需要复习的单词，去闯关学新词吧')
      const list = tasks.map(toWord)
      questions.value = buildQuestions(list, mode, await buildPool(list))
    }

    startedAt = Date.now()
    if (timer) clearInterval(timer)
    timer = setInterval(() => {
      elapsed.value = Math.floor((Date.now() - startedAt) / 1000)
    }, 1000)
  } catch (e) {
    errorMsg.value = e.message || '题目加载失败'
  } finally {
    loading.value = false
  }
}

loadQuestions()

onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (autoNextTimer) clearTimeout(autoNextTimer)
})

// ==================== 作答 ====================

/** 记录一道题：答对 0.7 秒后自动下一题，答错停住让用户看解析 */
function record(correct, chosen) {
  if (!current.value) return

  answers.value.push({
    wordId: current.value.wordId,
    correct,
    chosen,
    // 快照随作答带下去，答错时要写进错题本 / 复习任务
    snapshot: current.value.snapshot
  })
  feedback.value = { correct, correctAnswer: current.value.answer }

  if (correct) {
    autoNextTimer = setTimeout(next, 700)
  }
}

function chooseOption(option) {
  if (feedback.value || !current.value) return
  record(option === current.value.answer, option)
}

function submitTyped() {
  if (feedback.value || !current.value) return
  const value = typed.value.trim()
  if (!value) return
  record(isSpellingCorrect(value, current.value.answer), value)
}

function next() {
  if (advancedFor === index.value) return
  advancedFor = index.value
  if (autoNextTimer) {
    clearTimeout(autoNextTimer)
    autoNextTimer = null
  }

  if (index.value < total.value - 1) {
    index.value += 1
    feedback.value = null
    typed.value = ''
  } else {
    finish()
  }
}

/** 选项颜色：答完把正确答案标绿、选错的那项标红 */
function optionClass(option) {
  if (!feedback.value) return ''
  if (option === feedback.value.correctAnswer) return 'is-correct'
  const chosen = answers.value[answers.value.length - 1]?.chosen
  if (option === chosen) return 'is-wrong'
  return 'dim'
}

// ==================== 交卷 ====================

async function finish() {
  if (submitting.value) return
  submitting.value = true
  if (timer) clearInterval(timer)

  const durationSec = Math.floor((Date.now() - startedAt) / 1000)

  try {
    let data
    if (type === 'wrong') {
      data = await submitWrongPractice({ mode, durationSec, answers: answers.value })
    } else if (type === 'review') {
      data = await submitReview({ mode, durationSec, answers: answers.value })
    } else {
      data = await submitStage({
        freqLevel,
        stageNo,
        mode,
        durationSec,
        answers: answers.value,
        stageCount: stageCount || undefined
      })
    }
    report.value = data
    finished.value = true
  } catch (e) {
    errorMsg.value = '结果保存失败：' + (e.message || '请重试')
  } finally {
    submitting.value = false
  }
}

/** 结果页展示本次答错的词（词 + 释义 + 例句） */
const wrongDetails = computed(() => {
  if (!report.value || !report.value.wrongWordIds) return []
  const ids = new Set(report.value.wrongWordIds)
  const map = new Map()
  for (const q of questions.value) {
    if (ids.has(q.wordId) && !map.has(q.wordId)) {
      map.set(q.wordId, {
        wordId: q.wordId,
        word: q.snapshot.word,
        phonetic: q.snapshot.phonetic,
        meaning: q.snapshot.meaning,
        example: q.snapshot.example
      })
    }
  }
  return [...map.values()]
})

// ==================== 跳转 ====================

function goBack() {
  if (finished.value) return backToList()
  if (answers.value.length && !window.confirm('还没做完，确定退出吗？本次进度不会保存。')) return
  backToList()
}

function backToList() {
  if (type === 'wrong') router.replace('/wrong-book')
  else if (type === 'review') router.replace('/review')
  else router.replace(`/stage/${freqLevel}`)
}

function retrySame() {
  loadQuestions()
}

function goNextStage() {
  const nextNo = report.value?.nextStageNo
  if (!nextNo) return
  router.replace({
    path: '/quiz',
    query: { type: 'stage', level: freqLevel, stageNo: nextNo, mode, stageCount }
  })
}

function percentText(v) {
  return Math.round((v || 0) * 100) + '%'
}
</script>

<template>
  <div class="page-full quiz">
    <!-- 顶部：退出 + 进度 + 计时 -->
    <div class="quiz-head">
      <button class="nav-back" type="button" @click="goBack">‹</button>
      <div class="quiz-mid">
        <div class="progress">
          <div class="progress-bar" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <div class="quiz-count">
          <template v-if="!finished">{{ Math.min(index + 1, total) }} / {{ total }}</template>
          <template v-else>已完成</template>
        </div>
      </div>
      <div class="quiz-timer">{{ timeText }}</div>
    </div>

    <!-- 加载中 / 出错 -->
    <StatusBlock v-if="loading" type="loading" :loading-text="loadingText" />
    <StatusBlock v-else-if="errorMsg && !finished" icon="⚠️" :title="errorMsg">
      <button class="btn btn-primary btn-sm" @click="backToList">返回</button>
    </StatusBlock>

    <!-- ==================== 答题区 ==================== -->
    <template v-else-if="current && !finished">
      <div class="quiz-body">
        <div class="mode-tip">
          {{ mode === 'EN2CN' ? '选出正确的中文释义' : '根据中文释义拼写单词' }}
        </div>

        <!-- 英译汉 -->
        <template v-if="mode === 'EN2CN'">
          <div class="stem-word">{{ current.word }}</div>
          <div class="stem-phonetic">{{ current.phonetic }}</div>

          <div class="options">
            <button
              v-for="(opt, i) in current.options"
              :key="opt"
              type="button"
              class="option"
              :class="optionClass(opt)"
              @click="chooseOption(opt)"
            >
              <span class="option-index">{{ i + 1 }}</span>
              <span class="option-text">{{ opt }}</span>
            </button>
          </div>
        </template>

        <!-- 汉译英 -->
        <template v-else>
          <div class="stem-meaning">{{ current.meaning }}</div>
          <div class="spell-box">
            <input
              v-model="typed"
              class="input spell-input"
              type="text"
              inputmode="latin"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              :placeholder="`${String(current.answer).length} 个字母`"
              :disabled="!!feedback"
              @keyup.enter="submitTyped"
            />
          </div>
          <p class="spell-tip">不区分大小写；拼错一个字母也算错</p>
          <button
            v-if="!feedback"
            class="btn btn-primary btn-block confirm-btn"
            type="button"
            :disabled="!typed.trim()"
            @click="submitTyped"
          >
            确认
          </button>
        </template>

        <!-- 答题反馈 -->
        <div v-if="feedback" class="feedback" :class="feedback.correct ? 'ok' : 'bad'">
          <div class="fb-title">
            {{ feedback.correct ? '✓ 答对了' : '✗ 答错了' }}
            <span v-if="!feedback.correct" class="fb-answer">
              正确答案：{{ feedback.correctAnswer }}
            </span>
          </div>
          <div v-if="feedback.correct && !current.example" class="fb-sub">继续下一题…</div>
          <div v-if="current.example" class="fb-example">
            <span class="fb-example-label">例句</span>
            {{ current.example }}
          </div>
        </div>
      </div>

      <!-- 底部：答错时手动下一题 -->
      <div class="quiz-foot" v-if="feedback && !feedback.correct">
        <button class="btn btn-primary btn-block" type="button" @click="next">
          {{ index === total - 1 ? '看看结果' : '记住了，下一题' }}
        </button>
      </div>
    </template>

    <!-- ==================== 结果区 ==================== -->
    <template v-else-if="finished && report">
      <div class="result-body">
        <div class="result-hero" :class="{ pass: report.passed && type === 'stage' }">
          <div class="result-title">{{ resultTitle }}</div>
          <div class="result-score">
            {{ report.correctCount }}<span class="result-score-sub"> / {{ report.total }} 题</span>
          </div>
          <div class="result-accuracy">正确率 {{ percentText(report.accuracy) }}</div>
          <div v-if="type === 'stage'" class="result-pass">
            {{
              report.passed
                ? `已达到通关标准（${Math.round(PASS_ACCURACY * 100)}%）`
                : `再对一点就通关了（需 ${Math.round(PASS_ACCURACY * 100)}%）`
            }}
          </div>
        </div>

        <div class="result-stats">
          <div class="rs-cell">
            <div class="rs-num">{{ mmss(report.durationSec) }}</div>
            <div class="rs-label">用时</div>
          </div>
          <div class="rs-cell">
            <div class="rs-num">
              {{ type === 'stage' ? report.newWordCount : report.masteredCount || 0 }}
            </div>
            <div class="rs-label">{{ type === 'stage' ? '新增生词' : '移出错题本' }}</div>
          </div>
          <div class="rs-cell">
            <div class="rs-num">
              {{ type === 'stage' ? report.total - report.correctCount : report.remainWrong }}
            </div>
            <div class="rs-label">{{ type === 'stage' ? '答错' : '错题本剩余' }}</div>
          </div>
        </div>

        <!-- 答错的词：词卡形式，方便现场再记一遍 -->
        <template v-if="wrongDetails.length">
          <div class="section-title">这些词要重点记忆</div>
          <div v-for="w in wrongDetails" :key="w.wordId" class="wrong-item">
            <div class="wrong-word">
              {{ w.word }}
              <span class="wrong-phonetic">{{ w.phonetic }}</span>
            </div>
            <div class="wrong-meaning">{{ w.meaning }}</div>
            <div v-if="w.example" class="wrong-example">{{ w.example }}</div>
          </div>
        </template>

        <!-- 操作按钮 -->
        <div class="result-actions">
          <template v-if="type === 'stage'">
            <button
              v-if="report.nextStageNo"
              class="btn btn-primary btn-block"
              type="button"
              @click="goNextStage"
            >
              进入第 {{ report.nextStageNo }} 关
            </button>
            <button class="btn btn-ghost btn-block" type="button" @click="retrySame">再练一遍本关</button>
            <button class="btn btn-ghost btn-block" type="button" @click="backToList">
              返回关卡列表
            </button>
          </template>
          <template v-else>
            <button class="btn btn-primary btn-block" type="button" @click="backToList">
              {{ type === 'wrong' ? '回到错题本' : '回到复习计划' }}
            </button>
            <button class="btn btn-ghost btn-block" type="button" @click="retrySame">再来一组</button>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.quiz {
  background: var(--bg);
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
}

/* 顶部：退出按钮 + 进度条 + 计时 */
.quiz-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: var(--bg);
  position: sticky;
  top: 0;
  z-index: 10;
}

.quiz-mid {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.quiz-count {
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
  min-width: 46px;
  text-align: right;
}

.quiz-timer {
  font-size: 13px;
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
  min-width: 42px;
  text-align: right;
}

/* 题目主体：上下留白让内容垂直居中，拇指自然落在选项中下部 */
.quiz-body {
  flex: 1;
  padding: 6px 16px 16px;
  display: flex;
  flex-direction: column;
}

.mode-tip {
  font-size: 12px;
  color: var(--muted);
  text-align: center;
  margin: 10px 0 18px;
}

.stem-word {
  font-size: 34px;
  font-weight: 700;
  text-align: center;
  letter-spacing: 0.5px;
  word-break: break-word;
  line-height: 1.25;
}

.stem-phonetic {
  text-align: center;
  font-size: 14px;
  color: var(--muted);
  margin-top: 6px;
  min-height: 20px;
}

.stem-meaning {
  font-size: 22px;
  font-weight: 600;
  text-align: center;
  line-height: 1.5;
  margin: 6px 4px 4px;
  word-break: break-word;
}

/* 四个选项：每个 52px 高，一行一个，绝对点得准 */
.options {
  margin-top: 26px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 54px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  font-size: 15px;
  font-family: inherit;
  color: var(--text);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.option:active {
  background: #fafcff;
}

.option-index {
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: #f2f3f5;
  color: var(--muted);
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.option-text {
  flex: 1;
  line-height: 1.45;
}

.option.is-correct {
  border-color: var(--success);
  background: var(--success-light);
}

.option.is-correct .option-index {
  background: var(--success);
  color: #fff;
}

.option.is-wrong {
  border-color: var(--danger);
  background: var(--danger-light);
}

.option.is-wrong .option-index {
  background: var(--danger);
  color: #fff;
}

.option.dim {
  opacity: 0.55;
}

/* 拼写输入 */
.spell-box {
  margin-top: 26px;
}

.spell-input {
  height: 54px;
  text-align: center;
  font-size: 20px;
  letter-spacing: 1px;
}

.spell-tip {
  font-size: 12px;
  color: var(--muted);
  text-align: center;
  margin: 10px 0 0;
}

.confirm-btn {
  margin-top: 18px;
}

/* 反馈条 */
.feedback {
  margin-top: 20px;
  padding: 14px;
  border-radius: 12px;
  font-size: 14px;
}

.feedback.ok {
  background: var(--success-light);
  color: #529b2e;
}

.feedback.bad {
  background: var(--danger-light);
  color: #c45656;
}

.fb-title {
  font-weight: 600;
  font-size: 15px;
}

.fb-answer {
  margin-left: 8px;
  font-weight: 500;
}

.fb-sub {
  font-size: 12px;
  color: var(--muted);
  margin-top: 4px;
}

.fb-example {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.6;
}

.fb-example-label {
  display: inline-block;
  font-size: 11px;
  padding: 0 6px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.06);
  color: var(--text-2);
  margin-right: 6px;
}

.quiz-foot {
  padding: 10px 16px calc(14px + env(safe-area-inset-bottom));
  background: var(--bg);
}

/* ==================== 结果页 ==================== */

.result-body {
  padding: 6px 16px calc(24px + env(safe-area-inset-bottom));
}

.result-hero {
  background: #fff;
  border-radius: var(--radius);
  padding: 22px 16px;
  text-align: center;
  box-shadow: var(--shadow);
}

.result-hero.pass {
  background: linear-gradient(180deg, #f2fbeb, #fff);
}

.result-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-2);
}

.result-score {
  font-size: 40px;
  font-weight: 700;
  color: var(--primary);
  line-height: 1.15;
  margin-top: 8px;
}

.result-hero.pass .result-score {
  color: var(--success);
}

.result-score-sub {
  font-size: 15px;
  font-weight: 500;
  color: var(--muted);
}

.result-accuracy {
  font-size: 14px;
  color: var(--text-2);
  margin-top: 2px;
}

.result-pass {
  font-size: 12px;
  color: var(--muted);
  margin-top: 8px;
}

.result-stats {
  display: flex;
  background: #fff;
  border-radius: var(--radius);
  padding: 14px 6px;
  box-shadow: var(--shadow);
  margin-top: 12px;
}

.rs-cell {
  flex: 1;
  text-align: center;
}

.rs-num {
  font-size: 17px;
  font-weight: 600;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.rs-label {
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-2);
  margin: 20px 2px 10px;
}

.wrong-item {
  background: #fff;
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 10px;
  border-left: 3px solid var(--danger);
}

.wrong-word {
  font-size: 17px;
  font-weight: 600;
}

.wrong-phonetic {
  font-size: 12px;
  color: var(--muted);
  font-weight: 400;
  margin-left: 6px;
}

.wrong-meaning {
  font-size: 13px;
  color: var(--text-2);
  margin-top: 4px;
}

.wrong-example {
  font-size: 12px;
  color: var(--muted);
  margin-top: 4px;
  line-height: 1.6;
}

.result-actions {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
