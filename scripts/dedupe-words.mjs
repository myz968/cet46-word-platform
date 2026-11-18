// 词库去重与统计脚本
// 用法：node scripts/dedupe-words.mjs           只统计
//       node scripts/dedupe-words.mjs --fix     去掉重复词条（保留第一次出现的）
//
// 词库按下面的顺序去重，所以"保留第一次出现"等价于保留先处理的那个词条。
//
// 排序规则（重要，踩过两次坑）：
//   按文件"首次写入时间"升序 —— 先建的文件优先保住自己的词条，后追加的补充文件
//   遇到重复就让位。
//   为什么不用文件名排序：曾经按字典序排，结果后加的 words-level1-g.json 排在
//   words-level2-d.json 前面，把 371 个中频词抢成了高频；后来按字母分组，
//   words-level2-f.json 又排在 words-level3-*.json 前面，抢走 319 个低频词。
//   分级必须是"谁先定好的就不许改"，所以只能按创建顺序。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// 词库目录按脚本自身位置推算，换机器、换盘符都不用手改
const HERE = path.dirname(fileURLToPath(import.meta.url))
const DIR = path.resolve(HERE, '../backend/src/main/resources/db')
const fix = process.argv.includes('--fix')

const files = fs
  .readdirSync(DIR)
  .filter((f) => /^words-level\d-[a-z]\.json$/.test(f))
  .map((f) => ({ f, t: fs.statSync(path.join(DIR, f)).mtimeMs }))
  .sort((a, b) => a.t - b.t || (a.f < b.f ? -1 : 1))
  .map((x) => x.f)

const seen = new Map() // word(小写) -> 来源文件
const perLevel = { 1: 0, 2: 0, 3: 0 }
let total = 0
let dupCount = 0
const dupList = []

for (const file of files) {
  const full = path.join(DIR, file)
  const json = JSON.parse(fs.readFileSync(full, 'utf8'))
  const level = json.level
  const kept = []

  for (const w of json.words) {
    const key = String(w.word || '').trim().toLowerCase()
    if (!key) continue
    if (seen.has(key)) {
      dupCount++
      dupList.push(`${w.word} (${seen.get(key)} 已存在，${file} 重复)`)
      continue
    }
    seen.set(key, file)
    kept.push(w)
  }

  perLevel[level] = (perLevel[level] || 0) + kept.length
  total += kept.length
  console.log(`${file}: ${json.words.length} -> ${kept.length}`)

  if (fix && kept.length !== json.words.length) {
    json.words = kept
    fs.writeFileSync(full, JSON.stringify(json, null, 2) + '\n', 'utf8')
  }
}

console.log('---')
console.log(`总词数: ${total}`)
console.log(`高频 ${perLevel[1]} / 中频 ${perLevel[2]} / 低频 ${perLevel[3]}`)
console.log(`重复词条: ${dupCount}`)
if (dupList.length) console.log(dupList.slice(0, 30).join('\n'))
