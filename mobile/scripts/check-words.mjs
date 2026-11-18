// 词库自检脚本（零依赖）
// 用法：npm run check
//
// 检查三件事，改完词库或重新导出后跑一下，能提前发现"词数不对/单词重复/字段缺失"：
//   1. 三个难度文件都存在，总数是 5547
//   2. 单词全局唯一、id 唯一
//   3. 每条都有 word / meaning，音标和例句的覆盖率
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(HERE, '..', 'public', 'data')
const EXPECT_TOTAL = 5547

let failed = 0
const check = (name, ok, extra = '') => {
  console.log(`${ok ? '✓' : '✗'}  ${name}${extra ? '  ' + extra : ''}`)
  if (!ok) failed++
}

const indexFile = path.join(DATA_DIR, 'index.json')
if (!fs.existsSync(indexFile)) {
  console.error('找不到词库目录文件，请先执行：npm run build:words')
  process.exit(1)
}

const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'))
console.log(`词库版本：${index.version}`)
console.log('')

const ids = new Set()
const words = new Set()
let total = 0
let phoneticMissing = 0
let exampleMissing = 0

for (const info of index.levels) {
  const file = path.join(DATA_DIR, `words-level${info.level}.json`)
  if (!fs.existsSync(file)) {
    check(`第 ${info.level} 级文件存在`, false)
    continue
  }

  const json = JSON.parse(fs.readFileSync(file, 'utf8'))
  total += json.words.length
  check(
    `第 ${info.level} 级 ${info.levelName}：${json.words.length} 词`,
    json.words.length === info.count,
    `目录声明 ${info.count}`
  )

  for (const w of json.words) {
    if (ids.has(w.id)) check(`id 重复：${w.id}`, false)
    ids.add(w.id)

    const key = String(w.word || '').toLowerCase()
    if (words.has(key)) check(`单词重复：${w.word}`, false)
    words.add(key)

    if (!w.meaning) check(`缺释义：${w.word}`, false)
    if (!w.phonetic) phoneticMissing++
    if (!w.example) exampleMissing++
  }
}

console.log('')
check(`总词数 = ${EXPECT_TOTAL}`, total === EXPECT_TOTAL, `实际 ${total}`)
check('单词无重复', words.size === total, `${words.size} 个不重复`)
check('音标覆盖率 ≥ 95%', phoneticMissing / total < 0.05, `缺 ${phoneticMissing} 条`)
check('例句覆盖率 ≥ 95%', exampleMissing / total < 0.05, `缺 ${exampleMissing} 条`)

console.log('')
if (failed === 0) {
  console.log('词库自检通过 ✅')
  process.exit(0)
}
console.log(`有 ${failed} 项不通过 ❌`)
process.exit(1)
