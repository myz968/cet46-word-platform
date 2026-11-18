<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  apiStageQuestions,
  apiStageSubmit,
  apiWrongQuestions,
  apiWrongSubmit,
  apiReviewQuestions,
  apiReviewSubmit
} from '../api'

/**
 * 答题页（闯关 / 错题重练 / 艾宾浩斯复习 三种来源共用）
 *
 * 通过地址栏参数区分来源：/quiz?type=stage&level=1&stageNo=3&mode=EN2CN
 *   type=stage  闯关，结束后生成学习报告
 *   type=wrong  错题重练，答对即移出错题本
 *   type=review 复习，按记忆曲线推进阶段
 *
 * 判分在本地完成（题目里已带正确答案），好处是回答后能立刻反馈、无网络等待；
 * 一整轮结束后再一次性把作答结果提交给后端落库。
 */
const route = useRoute()
const router = useRouter()

const type = route.query.type || 'stage'
const freqLevel = Number(route.query.level || 1)
const stageNo = Number(route.query.stageNo || 1)
const mode = route.query.mode === 'CN2EN' ? 'CN2EN' : 'EN2CN'
const limit = Number(route.query.limit || 20)

const loading = ref(true)
const submitting = ref(false)
const finished = ref(false)
const questions = ref([])
const index = ref(0)
const answers = ref([])
const feedback = ref(null) // { correct, correctAnswer }
const typed = ref('') // 汉译英输入框内容
const report = ref(null)
const elapsed = ref(0)
const errorMsg = ref('')

let timer = null
let startedAt = 0

const current = computed(() => questions.value[index.value] || null)

/** 是否最后一题 */
const isLast = computed(() => index.value === questions.value.length - 1)

const progressPercent = computed(() =>
  questions.value.length ? Math.round((index.value / questions.value.length) * 100) : 0
)

/** 计时显示 mm:ss */
const timeText = computed(() => {
  const m = String(Math.floor(elapsed.value / 60)).padStart(2, '0')
  const s = String(elapsed.value % 60).padStart(2, '0')
  return `${m}:${s}`
})

/** 结果页文案细节随来源不同而变化 */
const resultTitle = computed(() => {
  if (type === 'wrong') return '错题重练完成'
  if (type === 'review') return '今日复习完成'
  return '本关完成'
})

// ===== 数据加载 =====

async function loadQuestions() {
  loading.value = true
  errorMsg.value = ''
  try {
    let data
    if (type === 'wrong') {
      data = await apiWrongQuestions(mode, limit)
    } else if (type === 'review') {
      data = await apiReviewQuestions(mode, limit)
    } else {
      data = await apiStageQuestions(freqLevel, stageNo, mode)
    }
    questions.value = data || []
    index.value = 0
    answers.value = []
    feedback.value = null
    typed.value = ''
    finished.value = false
    report.value = null
    elapsed.value = 0
    advancedFor.value = -1
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

onMounted(() => {
  loadQuestions()
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  window.removeEventListener('keydown', onKey)
})

// ===== 作答逻辑 =====

/** 记录一道题的结果；答对 0.7 秒后自动进入下一题，答错则停下来看解析 */
function record(correct, chosen) {
  if (!current.value) return
  answers.value.push({ wordId: current.value.wordId, correct, chosen })
  feedback.value = { correct, correctAnswer: current.value.answer }
  if (correct) {
    setTimeout(next, 700)
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
  // 拼写比较忽略大小写与首尾空格，避免因输入法/大写锁定误判
  record(value.toLowerCase() === String(current.value.answer).toLowerCase(), value)
}

/**
 * 进入下一题。
 * advancedFor 记录「已经为第几题推进过了」，防止「答对自动跳转」与「用户手动点下一题」
 * 同时发生时连续执行两次，导致中间跳过一题。
 */
const advancedFor = ref(-1)

function next() {
  if (advancedFor.value === index.value) return
  advancedFor.value = index.value
  if (index.value < questions.value.length - 1) {
    index.value += 1
    feedback.value = null
    typed.value = ''
  } else {
    finish()
  }
}

/** 键盘操作：1~4 选择选项，回车确认拼写或进入下一题 */
function onKey(e) {
  if (loading.value || finished.value || !current.value) return
  if (feedback.value) {
    if (e.key === 'Enter') next()
    return
  }
  if (mode === 'EN2CN' && ['1', '2', '3', '4'].includes(e.key)) {
    const option = current.value.options[Number(e.key) - 1]
    if (option) chooseOption(option)
  }
}

// ===== 提交与结果 =====

async function finish() {
  if (submitting.value) return
  submitting.value = true
  if (timer) clearInterval(timer)
  const durationSec = Math.floor((Date.now() - startedAt) / 1000)
  try {
    let data
    if (type === 'wrong') {
      data = await apiWrongSubmit({ mode, durationSec, answers: answers.value })
    } else if (type === 'review') {
      data = await apiReviewSubmit({ mode, durationSec, answers: answers.value })
    } else {
      data = await apiStageSubmit({
        freqLevel,
        stageNo,
        mode,
        durationSec,
        answers: answers.value
      })
    }
    report.value = data
    finished.value = true
  } catch (e) {
    // 提交失败时保留结果面板可重试
    errorMsg.value = '提交失败：' + (e.message || '请重试')
  } finally {
    submitting.value = false
  }
}

function retrySame() {
  loadQuestions()
}

function goNextStage() {
  router.push({ path: '/quiz', query: { type: 'stage', level: freqLevel, stageNo: report.value.nextStageNo, mode } })
}

function goBack() {
  if (type === 'wrong') router.push('/wrong-book')
  else if (type === 'review') router.push('/review')
  else router.push(`/stage/${freqLevel}`)
}

// ===== 展示辅助 =====

/** 选项配色：答完后正确答案标绿，选错的那项标红 */
function optionClass(option) {
  if (!feedback.value) return ''
  if (option === feedback.value.correctAnswer) return 'is-correct'
  const chosen = answers.value[answers.value.length - 1]?.chosen
  if (option === chosen) return 'is-wrong'
  return 'dim'
}

function accuracyText(value) {
  return Math.round((value || 0) * 100) + '%'
}
</script>

<template>
  <div class="quiz-page">
    <!-- 顶部进度条 -->
    <div class="quiz-head" v-if="!finished">
      <el-button text @click="goBack">← 退出</el-button>
      <div class="quiz-progress">
        <el-progress :percentage="progressPercent" :stroke-width="6" :show-text="false" />
        <span class="quiz-count">
          {{ Math.min(index + 1, questions.length) }} / {{ questions.length }}
        </span>
      </div>
      <div class="quiz-timer">{{ timeText }}</div>
    </div>

    <div v-loading="loading" class="quiz-body">
      <!-- 加载失败 / 没有题目 -->
      <el-empty v-if="!loading && errorMsg" :description="errorMsg">
        <el-button type="primary" @click="goBack">返回</el-button>
      </el-empty>

      <!-- ===== 答题区 ===== -->
      <div v-else-if="current && !finished" class="question-wrap">
        <div class="mode-tip">
          {{ mode === 'EN2CN' ? '选出正确的中文释义' : '根据释义拼写单词' }}
        </div>

        <!-- 英译汉题干：单词 + 音标 -->
        <template v-if="mode === 'EN2CN'">
          <div class="stem-word">{{ current.word }}</div>
          <div class="stem-phonetic">{{ current.phonetic }}</div>

          <div class="options">
            <div
              v-for="(opt, i) in current.options"
              :key="opt"
              class="option"
              :class="optionClass(opt)"
              @click="chooseOption(opt)"
            >
              <span class="option-index">{{ i + 1 }}</span>
              <span class="option-text">{{ opt }}</span>
            </div>
          </div>
        </template>

        <!-- 汉译英题干：中文释义 + 输入框 -->
        <template v-else>
          <div class="stem-meaning">{{ current.meaning }}</div>
          <el-input
            v-model="typed"
            class="spell-input"
            size="large"
            placeholder="输入英文单词后按回车"
            :disabled="!!feedback"
            @keyup.enter="submitTyped"
          />
          <div class="muted" style="text-align: center; margin-top: 8px">
            不区分大小写，拼错一个字母也算错
          </div>
        </template>

        <!-- 答题反馈 -->
        <div v-if="feedback" class="feedback" :class="feedback.correct ? 'ok' : 'bad'">
          <div class="fb-title">
            {{ feedback.correct ? '答对了' : '答错了' }}
            <span v-if="!feedback.correct" class="fb-answer">正确答案：{{ feedback.correctAnswer }}</span>
          </div>
          <div class="fb-example" v-if="current.example">{{ current.example }}</div>
          <div class="fb-actions" v-if="!feedback.correct">
            <el-button type="primary" @click="next">
              {{ isLast ? '查看结果' : '下一题' }}
            </el-button>
          </div>
        </div>
      </div>

      <!-- ===== 结果区 ===== -->
      <div v-else-if="finished && report" class="result-wrap">
        <div class="result-head">
          <div class="result-title">{{ resultTitle }}</div>
          <div class="result-rate">{{ accuracyText(report.accuracy) }}</div>
          <div class="result-sub">
            答对 {{ report.correctCount }} / {{ report.total }} 题
          </div>
        </div>

        <div class="result-stats">
          <div class="stat">
            <div class="stat-value">{{ report.durationSec }}s</div>
            <div class="stat-label">用时</div>
          </div>

          <!-- 闯关才有「新增生词」与通关判定 -->
          <template v-if="type === 'stage'">
            <div class="stat">
              <div class="stat-value">{{ report.newWordCount }}</div>
              <div class="stat-label">新增生词</div>
            </div>
            <div class="stat">
              <div class="stat-value" :class="report.passed ? 'green' : 'orange'">
                {{ report.passed ? '通关' : '未通关' }}
              </div>
              <div class="stat-label">本关判定</div>
            </div>
          </template>

          <template v-else-if="type === 'wrong'">
            <div class="stat">
              <div class="stat-value">{{ report.masteredCount }}</div>
              <div class="stat-label">移出错题本</div>
            </div>
            <div class="stat">
              <div class="stat-value">{{ report.remainWrong }}</div>
              <div class="stat-label">剩余错题</div>
            </div>
          </template>

          <template v-else>
            <div class="stat">
              <div class="stat-value">{{ report.remainWrong }}</div>
              <div class="stat-label">错题本剩余</div>
            </div>
          </template>
        </div>

        <!-- 闯关报告：本次答错的词 -->
        <div v-if="report.wrongWords && report.wrongWords.length" class="wrong-list">
          <div class="wrong-title">本次答错的单词（已加入错题本）</div>
          <div v-for="w in report.wrongWords" :key="w.wordId" class="wrong-item">
            <span class="wrong-word">{{ w.word }}</span>
            <span class="wrong-phonetic">{{ w.phonetic }}</span>
            <span class="wrong-meaning">{{ w.meaning }}</span>
          </div>
        </div>

        <div class="result-actions">
          <el-button v-if="type === 'stage' && report.nextStageNo" type="primary" @click="goNextStage">
            进入第 {{ report.nextStageNo }} 关
          </el-button>
          <el-button @click="retrySame">{{ type === 'stage' ? '重做本关' : '再来一轮' }}</el-button>
          <el-button text @click="goBack">返回</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quiz-page {
  max-width: 680px;
  margin: 0 auto;
  padding: 16px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.quiz-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0 16px;
}

.quiz-progress {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.quiz-progress :deep(.el-progress) {
  flex: 1;
}

.quiz-count {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
}

.quiz-timer {
  font-size: 13px;
  color: #606266;
  font-variant-numeric: tabular-nums;
  width: 48px;
  text-align: right;
}

.quiz-body {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.question-wrap {
  width: 100%;
  background: #fff;
  border-radius: 14px;
  padding: 28px 24px 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.mode-tip {
  font-size: 12px;
  color: #909399;
  text-align: center;
  margin-bottom: 18px;
}

.stem-word {
  font-size: 34px;
  font-weight: 700;
  text-align: center;
  letter-spacing: 0.5px;
  word-break: break-word;
}

.stem-phonetic {
  text-align: center;
  color: #909399;
  font-size: 14px;
  margin: 6px 0 24px;
}

.stem-meaning {
  font-size: 24px;
  font-weight: 600;
  text-align: center;
  margin: 16px 0 28px;
  line-height: 1.5;
}

.spell-input {
  margin-bottom: 4px;
}

.spell-input :deep(input) {
  text-align: center;
  font-size: 20px;
  letter-spacing: 1px;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.12s;
}

.option:hover {
  border-color: #409eff;
  background: #f5faff;
}

.option-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: #f2f3f5;
  color: #909399;
  font-size: 12px;
  flex-shrink: 0;
}

.option-text {
  font-size: 15px;
  line-height: 1.5;
}

.option.is-correct {
  border-color: #67c23a;
  background: #f0f9eb;
}

.option.is-correct .option-index {
  background: #67c23a;
  color: #fff;
}

.option.is-wrong {
  border-color: #f56c6c;
  background: #fef0f0;
}

.option.is-wrong .option-index {
  background: #f56c6c;
  color: #fff;
}

.option.dim {
  opacity: 0.55;
}

.feedback {
  margin-top: 20px;
  padding: 14px 16px;
  border-radius: 10px;
}

.feedback.ok {
  background: #f0f9eb;
}

.feedback.bad {
  background: #fef0f0;
}

.fb-title {
  font-size: 14px;
  font-weight: 600;
}

.feedback.ok .fb-title {
  color: #67c23a;
}

.feedback.bad .fb-title {
  color: #f56c6c;
}

.fb-answer {
  margin-left: 10px;
  color: #303133;
  font-weight: 700;
}

.fb-example {
  margin-top: 6px;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}

.fb-actions {
  margin-top: 12px;
  text-align: right;
}

/* ===== 结果 ===== */
.result-wrap {
  width: 100%;
  background: #fff;
  border-radius: 14px;
  padding: 32px 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  text-align: center;
}

.result-title {
  font-size: 16px;
  color: #606266;
}

.result-rate {
  font-size: 48px;
  font-weight: 700;
  color: #409eff;
  line-height: 1.2;
  margin: 6px 0;
}

.result-sub {
  font-size: 13px;
  color: #909399;
}

.result-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
  margin: 24px 0;
}

.stat {
  background: #f7f9fc;
  border-radius: 10px;
  padding: 14px 8px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #303133;
}

.stat-value.green {
  color: #67c23a;
}

.stat-value.orange {
  color: #e6a23c;
}

.stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.wrong-list {
  text-align: left;
  border-top: 1px dashed #ebeef5;
  padding-top: 16px;
}

.wrong-title {
  font-size: 13px;
  color: #606266;
  margin-bottom: 10px;
  font-weight: 600;
}

.wrong-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
  border-bottom: 1px solid #fafafa;
}

.wrong-word {
  font-weight: 600;
  min-width: 96px;
}

.wrong-phonetic {
  color: #909399;
  font-size: 12px;
  min-width: 110px;
}

.wrong-meaning {
  color: #606266;
}

.result-actions {
  margin-top: 24px;
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}
</style>
