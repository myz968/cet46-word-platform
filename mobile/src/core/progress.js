/**
 * 业务规则层 —— 逐条对齐桌面端 SpringBoot 的实现，保证两个版本学出来的东西一样。
 *
 * 复刻的规则清单：
 *   1. 通关线 60%（Constants.PASS_ACCURACY = 0.6）
 *   2. 艾宾浩斯间隔 0/1/2/4/7 天，第 5 阶段答对即"已完成全部复习"
 *   3. 答错 → 进错题本（错误次数 +1）+ 复习任务打回第 1 阶段
 *   4. 答对 → 复习阶段 +1；本来不在复习队列里的新词什么也不做
 *   5. 错题重练答对即视为掌握（移出错题本），答错则错误次数再 +1
 *   6. 新增生词 = 本次不同单词数 − 此前已作答过的单词数（必须在写记录之前统计）
 *   7. 每关记录历史最好正确率与挑战次数
 *
 * 所有写操作都用 IndexedDB 事务包起来，避免"写到一半关掉页面"造成半截数据。
 */
import { STORE, transact, getAllKeysByIndex, countByIndex } from '../db'
import { LEVEL_NAMES, PASS_ACCURACY, REVIEW_INTERVALS, USER_ID } from './constants'
import { now, plusDays } from './time'
import { loadCatalog, stageCountOf } from './wordBank'

/** 错题本 / 复习任务的主键：同一用户同一单词只有一条 */
const keyOf = (wordId) => [USER_ID, wordId]

/**
 * 把单词内容拍平成要随记录存下来的字段。
 * 桌面端靠 JOIN 词库表拿词面信息，移动端词库是分片懒加载的（甚至可能被清缓存），
 * 所以错题本/复习任务里直接存一份快照，随时都能正常显示。
 */
function snapshotOf(snapshot) {
  const s = snapshot || {}
  return {
    word: s.word || '',
    phonetic: s.phonetic || '',
    meaning: s.meaning || '',
    example: s.example || '',
    freqLevel: s.freqLevel || 0
  }
}

/**
 * 处理一道题的作答结果（三个场景共用）。
 *
 * @param {number} wordId
 * @param {boolean} correct 是否答对
 * @param {string} when 作答时间 'yyyy-MM-dd HH:mm:ss'
 * @param {object} [snapshot] 单词快照（错题/复习记录里会存一份）
 */
function applyAnswer(wordId, correct, when, snapshot) {
  const snap = snapshotOf(snapshot)

  return transact([STORE.WRONG, STORE.REVIEW], (stores) => {
    const wrongStore = stores[STORE.WRONG]
    const reviewStore = stores[STORE.REVIEW]

    // ===== 答错 =====
    if (!correct) {
      // 1) 错题本：有就累加次数，没有就新建
      const wq = wrongStore.get(keyOf(wordId))
      wq.onsuccess = () => {
        const old = wq.result
        wrongStore.put({
          userId: USER_ID,
          wordId,
          wrongCount: (old && old.wrongCount ? old.wrongCount : 0) + 1,
          mastered: 0, // 又错了，重新变成"未掌握"
          lastWrongTime: when,
          createTime: old ? old.createTime : when,
          ...snap
        })

        // 2) 复习任务：打回第 1 阶段，当天即可复习（间隔 0 天）
        const tq = reviewStore.get(keyOf(wordId))
        tq.onsuccess = () => {
          const oldTask = tq.result
          reviewStore.put({
            userId: USER_ID,
            wordId,
            stage: 1,
            dueTime: plusDays(REVIEW_INTERVALS[0]),
            finished: 0,
            createTime: oldTask ? oldTask.createTime : when,
            updateTime: when,
            ...snap
          })
        }
      }
      return
    }

    // ===== 答对：推进记忆阶段 =====
    const tq = reviewStore.get(keyOf(wordId))
    tq.onsuccess = () => {
      const task = tq.result
      // 不在复习队列里（一次就答对的新词）或已完成全部轮次，什么都不用做
      if (!task || task.finished === 1) return

      const current = task.stage || 1
      if (current >= REVIEW_INTERVALS.length) {
        // 第 5 阶段也答对 → 标记完成，不再推送
        reviewStore.put({ ...task, finished: 1, updateTime: when })
        return
      }

      const nextStage = current + 1
      reviewStore.put({
        ...task,
        stage: nextStage,
        dueTime: plusDays(REVIEW_INTERVALS[nextStage - 1]),
        finished: 0,
        updateTime: when
      })
    }
  })
}

/** 错题重练答对 → 标记已掌握（仍保留记录，只是不再出现在错题本列表里） */
function markMastered(wordId) {
  return transact(STORE.WRONG, (stores) => {
    const store = stores[STORE.WRONG]
    const q = store.get(keyOf(wordId))
    q.onsuccess = () => {
      const row = q.result
      if (!row) return
      store.put({ ...row, mastered: 1 })
    }
  })
}

/** 更新某关的最好成绩与挑战次数 */
function upsertUserStage(freqLevel, stageNo, accuracy, when) {
  return transact(STORE.USER_STAGES, (stores) => {
    const store = stores[STORE.USER_STAGES]
    const q = store.get([USER_ID, freqLevel, stageNo])
    q.onsuccess = () => {
      const old = q.result
      store.put({
        userId: USER_ID,
        freqLevel,
        stageNo,
        bestAccuracy: Math.max(old ? old.bestAccuracy : 0, accuracy),
        playCount: (old ? old.playCount : 0) + 1,
        lastTime: when
      })
    }
  })
}

/** 把正确率算成保留两位的小数，和桌面端一致（0.85 这种） */
function toAccuracy(correct, total) {
  return total ? Math.round((correct * 100) / total) / 100 : 0
}

/**
 * 闯关交卷：写作答记录、更新错题本与复习队列、记录关卡成绩、给出学习报告。
 *
 * @returns 学习报告 { total, correctCount, accuracy, durationSec, newWordCount,
 *                    passed, nextStageNo, wrongWordIds, levelName }
 */
export async function submitStage({ freqLevel, stageNo, mode, durationSec, answers, stageCount }) {
  const when = now()
  const list = (answers || []).filter((a) => a && a.wordId)
  const ids = [...new Set(list.map((a) => a.wordId))]

  // 新增生词：先数一遍"以前答过哪些词"，再写本次记录，顺序不能反
  const answeredKeys = await getAllKeysByIndex(STORE.ANSWERS, 'by_wordId')
  const answeredSet = new Set(answeredKeys)
  const newWordCount = Math.max(0, ids.filter((id) => !answeredSet.has(id)).length)

  let correctCount = 0
  const wrongWordIds = []
  const records = []

  for (const item of list) {
    const correct = !!item.correct
    if (correct) {
      correctCount++
    } else if (!wrongWordIds.includes(item.wordId)) {
      wrongWordIds.push(item.wordId)
    }
    await applyAnswer(item.wordId, correct, when, item.snapshot)
    records.push({
      userId: USER_ID,
      wordId: item.wordId,
      mode,
      correct: correct ? 1 : 0,
      freqLevel,
      stageNo,
      createTime: when
    })
  }

  // 作答记录批量入库
  await transact(STORE.ANSWERS, (stores) => {
    const store = stores[STORE.ANSWERS]
    records.forEach((r) => store.add(r))
  })

  const total = list.length
  const accuracy = toAccuracy(correctCount, total)
  const passed = accuracy >= PASS_ACCURACY

  await upsertUserStage(freqLevel, stageNo, accuracy, when)

  // 下一关：最后一关时给 null，前端据此显示"已到最后一关"
  let sc = stageCount
  if (!sc) {
    const catalog = await loadCatalog()
    const info = catalog.levels.find((l) => l.level === freqLevel)
    sc = info ? info.stageCount || stageCountOf(info.count) : stageNo
  }

  await transact(STORE.STAGES, (stores) => {
    stores[STORE.STAGES].add({
      userId: USER_ID,
      freqLevel,
      stageNo,
      mode,
      total,
      correctCount,
      accuracy,
      durationSec: durationSec || 0,
      newWordCount,
      createTime: when
    })
  })

  return {
    total,
    correctCount,
    accuracy,
    durationSec: durationSec || 0,
    newWordCount,
    passed,
    nextStageNo: stageNo < sc ? stageNo + 1 : null,
    wrongWordIds,
    levelName: LEVEL_NAMES[freqLevel] || ''
  }
}

/**
 * 错题重练交卷。
 * 规则：答对即掌握（移出错题本），答错则错误次数 +1 并重新排复习。
 */
export async function submitWrongPractice({ mode, durationSec, answers }) {
  const when = now()
  const list = (answers || []).filter((a) => a && a.wordId)

  let correctCount = 0
  let masteredCount = 0

  for (const item of list) {
    if (item.correct) {
      correctCount++
      masteredCount++
      await markMastered(item.wordId)
      await applyAnswer(item.wordId, true, when, item.snapshot)
    } else {
      await applyAnswer(item.wordId, false, when, item.snapshot)
    }
  }

  const total = list.length
  return {
    total,
    correctCount,
    accuracy: toAccuracy(correctCount, total),
    durationSec: durationSec || 0,
    masteredCount,
    remainWrong: await countByIndex(STORE.WRONG, 'by_user_mastered', [USER_ID, 0]),
    mode
  }
}

/** 艾宾浩斯复习交卷：答对推进阶段，答错打回第 1 阶段并记入错题本 */
export async function submitReview({ mode, durationSec, answers }) {
  const when = now()
  const list = (answers || []).filter((a) => a && a.wordId)

  let correctCount = 0
  for (const item of list) {
    if (item.correct) correctCount++
    await applyAnswer(item.wordId, !!item.correct, when, item.snapshot)
  }

  const total = list.length
  return {
    total,
    correctCount,
    accuracy: toAccuracy(correctCount, total),
    durationSec: durationSec || 0,
    remainWrong: await countByIndex(STORE.WRONG, 'by_user_mastered', [USER_ID, 0]),
    mode
  }
}

/**
 * 清空全部学习数据（设置页「清空学习记录」用）。
 * 只删作答/错题/复习/关卡进度，不删词库缓存 —— 下次打开不用重新下载 800KB。
 */
export async function clearLearningData() {
  await transact(
    [STORE.ANSWERS, STORE.WRONG, STORE.REVIEW, STORE.STAGES, STORE.USER_STAGES],
    (stores) => {
      stores[STORE.ANSWERS].clear()
      stores[STORE.WRONG].clear()
      stores[STORE.REVIEW].clear()
      stores[STORE.STAGES].clear()
      stores[STORE.USER_STAGES].clear()
    }
  )
}
