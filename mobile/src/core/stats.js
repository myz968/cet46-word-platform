/**
 * 统计查询层。
 *
 * 移动端是单机单用户，数据量也就几千条，所以大部分统计直接读出来在内存里算，
 * 比写一堆索引查询更好读也好维护（桌面端有 SQL 的 group by，这里用 JS 做同样的事）。
 */
import { STORE, getAll, remove } from '../db'
import { PASS_ACCURACY, USER_ID } from './constants'
import { dateOnly, now, todayStart } from './time'
import { loadCatalog, stageCountOf } from './wordBank'

/** 今天的到期复习任务（含逾期），按到期时间从早到晚 */
export async function getDueTasks(limit = 20) {
  const current = now()
  const all = await getAll(STORE.REVIEW)
  return all
    .filter((t) => t.userId === USER_ID && t.finished === 0 && t.dueTime <= current)
    .sort((a, b) => (a.dueTime < b.dueTime ? -1 : 1))
    .slice(0, limit)
}

/** 今天到期数量 */
export async function countDue() {
  return (await getDueTasks(9999)).length
}

/** 复习计划里还没走完的词数（含未到期） */
export async function countPending() {
  const all = await getAll(STORE.REVIEW)
  return all.filter((t) => t.userId === USER_ID && t.finished === 0).length
}

/** 错题本分页（只列未掌握的，按最近答错时间倒序 —— 和桌面端一致） */
export async function getWrongPage(pageNo = 1, pageSize = 10) {
  const all = await getAll(STORE.WRONG)
  const list = all
    .filter((w) => w.userId === USER_ID && w.mastered === 0)
    .sort((a, b) => (a.lastWrongTime < b.lastWrongTime ? 1 : -1))

  const pn = Math.max(1, pageNo)
  const start = (pn - 1) * pageSize
  return {
    total: list.length,
    pageNo: pn,
    pageSize,
    list: list.slice(start, start + pageSize)
  }
}

/** 从错题本移除（也用于"手动标记已掌握"） */
export async function removeWrongWord(wordId) {
  return remove(STORE.WRONG, [USER_ID, wordId])
}

/** 某个难度下每一关的成绩：{ stageNo: { bestAccuracy, playCount, passed } } */
export async function getStageProgress(freqLevel) {
  const all = await getAll(STORE.USER_STAGES)
  const map = new Map()
  for (const row of all) {
    if (row.userId !== USER_ID || row.freqLevel !== freqLevel) continue
    map.set(row.stageNo, {
      bestAccuracy: row.bestAccuracy || 0,
      playCount: row.playCount || 0,
      passed: (row.bestAccuracy || 0) >= PASS_ACCURACY
    })
  }
  return map
}

/** 三个难度各自的词数、关卡数、已通关数（首页用） */
export async function getLevelSummaries() {
  const catalog = await loadCatalog()
  const stages = await getAll(STORE.USER_STAGES)

  return catalog.levels.map((info) => {
    const passedCount = stages.filter(
      (s) =>
        s.userId === USER_ID &&
        s.freqLevel === info.level &&
        (s.bestAccuracy || 0) >= PASS_ACCURACY
    ).length

    return {
      ...info,
      stageCount: info.stageCount || stageCountOf(info.count),
      passedCount
    }
  })
}

/** 学习报告的数据汇总（对应桌面端 /api/profile/overview） */
export async function getOverview() {
  const [answers, wrongs, reviews, stages] = await Promise.all([
    getAll(STORE.ANSWERS),
    getAll(STORE.WRONG),
    getAll(STORE.REVIEW),
    getAll(STORE.USER_STAGES)
  ])

  const mine = answers.filter((a) => a.userId === USER_ID)
  const learned = new Set(mine.map((a) => a.wordId))
  const correct = mine.filter((a) => a.correct === 1).length
  const total = mine.length

  // 今日作答（用于首页"今天学了几个词"）
  const todayBegin = todayStart()
  const todayAnswers = mine.filter((a) => a.createTime >= todayBegin)
  const todayLearned = new Set(todayAnswers.map((a) => a.wordId)).size

  const pendingReview = reviews.filter((t) => t.userId === USER_ID && t.finished === 0).length
  const passedStages = stages.filter(
    (s) => s.userId === USER_ID && (s.bestAccuracy || 0) >= PASS_ACCURACY
  ).length

  return {
    learnedWords: learned.size,
    totalAnswers: total,
    accuracy: total ? Math.round((correct * 100) / total) / 100 : 0,
    wrongCount: wrongs.filter((w) => w.userId === USER_ID && w.mastered === 0).length,
    pendingReview,
    passedStages,
    todayLearned,
    todayAnswers: todayAnswers.length,
    reviewPlanTotal: reviews.filter((t) => t.userId === USER_ID).length
  }
}

/** 最近闯关记录（报告页列表） */
export async function getRecentRecords(limit = 5) {
  const all = await getAll(STORE.STAGES)
  return all
    .filter((r) => r.userId === USER_ID)
    .sort((a, b) => (a.createTime < b.createTime ? 1 : -1))
    .slice(0, limit)
}

/** 最近 7 天每天的作答量与正确率，用于报告页的小柱状图 */
export async function getLast7Days() {
  const all = await getAll(STORE.ANSWERS)
  const mine = all.filter((a) => a.userId === USER_ID)

  const buckets = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = dateOnly(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`
    )
    buckets.push({ date: key, label: `${d.getMonth() + 1}/${d.getDate()}`, total: 0, correct: 0 })
  }

  const index = new Map(buckets.map((b) => [b.date, b]))
  for (const a of mine) {
    const bucket = index.get(dateOnly(a.createTime))
    if (!bucket) continue
    bucket.total++
    if (a.correct === 1) bucket.correct++
  }

  return buckets
}

/** 每个难度的通关进度百分比，首页进度条用 */
export function passPercent(passedCount, stageCount) {
  if (!stageCount) return 0
  return Math.min(100, Math.round((passedCount / stageCount) * 100))
}
