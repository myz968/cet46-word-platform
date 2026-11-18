// 三级词库导出脚本（移动端专用）
// 用法：node scripts/build-words.mjs
//
// 作用：把后端的词库 JSON（backend/src/main/resources/db/words-level*.json）
// 按「桌面端完全一致的规则」去重后，导出成 3 份供手机端懒加载的文件：
//   mobile/public/data/words-level1.json  高频
//   mobile/public/data/words-level2.json  中频
//   mobile/public/data/words-level3.json  低频
//   mobile/public/data/index.json         目录（词数、关卡数），首页秒开用
//
// 为什么拆 3 份：手机弱网下一次性下 900KB 会明显卡顿。
// 拆开后进哪个难度才下哪一份（80~280KB），下过的会写进 IndexedDB 缓存，下次不再请求。
//
// 去重顺序必须和后端一致：按文件「首次写入时间」升序，先定好分级的文件优先。
// 这条踩过两次坑（按字典序会把几百个中频词抢成高频），详见 backend 那边 dedupe 脚本注释。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const MOBILE_ROOT = path.resolve(HERE, '..')
const SRC_DIR = path.resolve(MOBILE_ROOT, '..', 'backend', 'src', 'main', 'resources', 'db')
const OUT_DIR = path.resolve(MOBILE_ROOT, 'public', 'data')

/** 词库版本号：改了词库就手动改一下，手机端会据此判断要不要重新导入 */
const WORD_BANK_VERSION = '1.0.0-5547'

const LEVEL_NAMES = { 1: '高频基础', 2: '中频进阶', 3: '低频冲刺' }
const LEVEL_DESCS = {
  1: '最常用的核心词汇，先把地基打牢',
  2: '四六级常考的重点词，拉开分差的地方',
  3: '低频难词，冲刺高分用'
}

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`找不到后端词库目录：${SRC_DIR}`)
    process.exit(1)
  }

  // 按文件 mtime 升序（和后端 dedupe-words.mjs 保持同一规则）
  const files = fs
    .readdirSync(SRC_DIR)
    .filter((f) => /^words-level\d-[a-z]\.json$/.test(f))
    .map((f) => ({ f, t: fs.statSync(path.join(SRC_DIR, f)).mtimeMs }))
    .sort((a, b) => a.t - b.t || (a.f < b.f ? -1 : 1))
    .map((x) => x.f)

  const seen = new Set()
  const bucket = { 1: [], 2: [], 3: [] }
  let dropped = 0

  for (const file of files) {
    const json = JSON.parse(fs.readFileSync(path.join(SRC_DIR, file), 'utf8'))
    const level = Number(json.level)
    if (!bucket[level]) continue

    for (const w of json.words || []) {
      const word = String(w.word || '').trim()
      const key = word.toLowerCase()
      if (!key) continue
      if (seen.has(key)) {
        dropped++
        continue
      }
      seen.add(key)

      bucket[level].push({
        // 固定 id：级别 * 100000 + 该级别内序号。
        // 不用自增，保证每次构建出来的 id 都一样，用户换手机/清缓存重导也不会串数据。
        id: level * 100000 + bucket[level].length + 1,
        word,
        phonetic: String(w.phonetic || ''),
        meaning: String(w.meaning || ''),
        example: String(w.example || ''),
        seq: bucket[level].length + 1
      })
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })

  const levels = []
  let total = 0
  for (const level of [1, 2, 3]) {
    const words = bucket[level]
    total += words.length
    const payload = {
      version: WORD_BANK_VERSION,
      level,
      levelName: LEVEL_NAMES[level],
      count: words.length,
      words
    }
    const file = path.join(OUT_DIR, `words-level${level}.json`)
    fs.writeFileSync(file, JSON.stringify(payload), 'utf8')
    const kb = (fs.statSync(file).size / 1024).toFixed(0)

    levels.push({
      level,
      levelName: LEVEL_NAMES[level],
      description: LEVEL_DESCS[level],
      count: words.length,
      stageCount: Math.ceil(words.length / 20),
      fileKb: Number(kb)
    })
    console.log(`words-level${level}.json   ${words.length} 词   ${kb} KB`)
  }

  fs.writeFileSync(
    path.join(OUT_DIR, 'index.json'),
    JSON.stringify({ version: WORD_BANK_VERSION, total, levels }, null, 2) + '\n',
    'utf8'
  )

  console.log('---')
  console.log(`总词数: ${total}`)
  console.log(`丢弃重复词条: ${dropped}`)
  if (total !== 5547) {
    console.warn(`⚠ 期望 5547 词，实际 ${total} 词。词库有变动时请同步更新 WORD_BANK_VERSION`)
  }
}

main()
