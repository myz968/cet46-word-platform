/**
 * 出题器 —— 逻辑与桌面端 QuestionBuilder.java 完全一致。
 *
 * 英译汉（EN2CN）：题面是单词 + 音标，给 4 个中文释义选项
 *                （正确项 + 3 个同难度随机干扰项，按释义文本去重，最后打乱顺序）
 * 汉译英（CN2EN）：题面是中文释义，用户手敲拼写，不给选项
 *
 * 判分放在前端本地做（题目里本身就带答案），好处是点完立刻出结果、不用等网络，
 * 一整轮结束再统一写进 IndexedDB。
 */
import { MODE_EN2CN } from './constants'

/** Fisher-Yates 洗牌，返回新数组（不改原数组） */
export function shuffle(list) {
  const arr = list.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * 把单词列表变成题目列表。
 *
 * @param {Array} words 本次要考的单词（顺序即出题顺序）
 * @param {string} mode EN2CN / CN2EN
 * @param {Array} pool 干扰项来源：同难度的全部单词
 */
export function buildQuestions(words, mode, pool = words) {
  // 干扰项池子只打乱一次，比每题都洗一遍省时间
  const shuffledPool = shuffle(pool)

  return words.map((w, i) => {
    const base = {
      index: i + 1,
      wordId: w.id,
      example: w.example || '',
      answer: mode === MODE_EN2CN ? w.meaning : w.word,
      // 单词快照：答错时要写进错题本 / 复习任务。
      // 桌面端是每次 JOIN 词库表取词，移动端为了"清掉词库缓存后错题本依然能看"
      // 直接把词条内容随记录存一份，读起来也更快。
      snapshot: {
        word: w.word,
        phonetic: w.phonetic || '',
        meaning: w.meaning || '',
        example: w.example || '',
        freqLevel: w.freqLevel
      }
    }

    if (mode === MODE_EN2CN) {
      const options = new Set([w.meaning])
      for (const candidate of shuffledPool) {
        if (options.size >= 4) break
        if (!candidate.meaning || candidate.meaning === w.meaning) continue
        options.add(candidate.meaning)
      }
      return {
        ...base,
        word: w.word,
        phonetic: w.phonetic || '',
        meaning: null,
        options: shuffle([...options])
      }
    }

    // 汉译英：题干是释义，没有选项
    return {
      ...base,
      word: null,
      phonetic: '',
      meaning: w.meaning,
      options: []
    }
  })
}

/**
 * 判断拼写是否正确。
 * 与桌面端一致：忽略大小写和首尾空格（避免大写锁定、输入法带空格导致误判），
 * 但拼错一个字母就算错 —— 这是背单词，不能放宽。
 */
export function isSpellingCorrect(input, answer) {
  return String(input || '').trim().toLowerCase() === String(answer || '').trim().toLowerCase()
}

/** 难度 → 中文名（结果页文案用） */
export function modeText(mode) {
  return mode === MODE_EN2CN ? '英译汉' : '汉译英'
}
