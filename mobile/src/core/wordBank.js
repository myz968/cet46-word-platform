/**
 * 词库加载器（离线优先）。
 *
 * 数据流：
 *   首次打开某个难度 → fetch ./data/words-levelN.json（80~360KB）→ 写入 IndexedDB → 出题
 *   再次打开同一难度 → 直接读 IndexedDB，零网络请求，飞行模式也能用
 *
 * 词库是「按难度分片」的：进高频只下高频那 1630 词，
 * 不会因为要背高频词就先等 5547 个词全部下载完。
 */
import { STORE, bulkPut, getAllByIndex, getMeta, setMeta, transact } from '../db'
import { LEVEL_SIZE } from './constants'

/** 目录缓存（词数、关卡数），首页展示用，体积极小 */
let catalogCache = null

/** 每个难度的单词列表缓存，避免同一关卡反复读库 */
const levelCache = new Map()

const META_CATALOG = 'catalog'
const metaKeyOfLevel = (level) => `level:${level}`

/** 词库文件的地址（相对当前页面，配合 vite base './' 任何部署路径都能用） */
function dataUrl(file) {
  return `${import.meta.env.BASE_URL}data/${file}`
}

/**
 * 读取词库目录。
 * 优先走网络拿最新版本；断网时退回 IndexedDB 里缓存的那份，保证离线也能看到词数和关卡。
 */
export async function loadCatalog() {
  if (catalogCache) return catalogCache

  try {
    const res = await fetch(dataUrl('index.json'), { cache: 'no-cache' })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const json = await res.json()
    catalogCache = json
    await setMeta(META_CATALOG, json)
    return json
  } catch (e) {
    const cached = await getMeta(META_CATALOG)
    if (cached) {
      catalogCache = cached
      return cached
    }
    throw new Error('词库目录加载失败，请检查网络后刷新页面')
  }
}

/** 正在下载中的难度：防止首页预加载和用户点击同时触发两次下载 */
const pending = new Map()

/**
 * 确保某个难度的词库已经在本地。
 *
 * @param {number} level 1/2/3
 * @param {(text: string) => void} [onStatus] 加载状态回调，用于页面显示"正在下载词库…"
 * @returns {Promise<Array>} 该难度全部单词（按 seq 升序）
 */
export function ensureLevel(level, onStatus) {
  if (levelCache.has(level)) return Promise.resolve(levelCache.get(level))
  if (pending.has(level)) return pending.get(level)

  const task = doEnsureLevel(level, onStatus).finally(() => pending.delete(level))
  pending.set(level, task)
  return task
}

/** ensureLevel 的实际实现（带并发去重的外壳在上面） */
async function doEnsureLevel(level, onStatus) {
  if (levelCache.has(level)) return levelCache.get(level)

  const catalog = await loadCatalog()
  const info = catalog.levels.find((x) => x.level === level)
  const expected = info ? info.count : 0

  const meta = await getMeta(metaKeyOfLevel(level))
  const ready =
    meta && meta.version === catalog.version && meta.count === expected && expected > 0

  if (!ready) {
    onStatus && onStatus('正在下载词库…')
    let json
    try {
      const res = await fetch(dataUrl(`words-level${level}.json`), { cache: 'force-cache' })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      json = await res.json()
    } catch (e) {
      // 已经缓存过旧版本也能凑合用，总比打不开强
      const fallback = await readLevelFromDb(level)
      if (fallback.length) {
        levelCache.set(level, fallback)
        return fallback
      }
      throw new Error(`第 ${level} 级词库下载失败，请检查网络后重试`)
    }

    onStatus && onStatus(`正在保存 ${json.count} 个单词…`)
    // 版本变了先清掉这个难度的旧数据，避免残留新旧混杂
    await clearLevelWords(level)

    const rows = json.words.map((w) => ({
      id: w.id,
      word: w.word,
      phonetic: w.phonetic || '',
      meaning: w.meaning || '',
      example: w.example || '',
      freqLevel: level,
      seq: w.seq
    }))
    await bulkPut(STORE.WORDS, rows)
    await setMeta(metaKeyOfLevel(level), {
      version: json.version,
      count: rows.length,
      loadedAt: Date.now()
    })
  }

  const words = await readLevelFromDb(level)
  levelCache.set(level, words)
  return words
}

/** 从 IndexedDB 读某个难度的全部单词，按 seq 升序 */
async function readLevelFromDb(level) {
  const rows = await getAllByIndex(STORE.WORDS, 'by_level', level)
  return rows.sort((a, b) => a.seq - b.seq)
}

/** 清空某个难度的单词（版本升级时用） */
async function clearLevelWords(level) {
  await transact(STORE.WORDS, (stores) => {
    const store = stores[STORE.WORDS]
    const req = store.index('by_level').openCursor(level)
    req.onsuccess = () => {
      const cursor = req.result
      if (!cursor) return
      cursor.delete()
      cursor.continue()
    }
  })
  levelCache.delete(level)
}

/** 该难度的关卡数（每关 20 词，最后一关可能不满） */
export function stageCountOf(total) {
  return Math.ceil((total || 0) / LEVEL_SIZE)
}

/** 取某一关的单词 */
export async function getStageWords(level, stageNo) {
  const words = await ensureLevel(level)
  const start = (stageNo - 1) * LEVEL_SIZE
  return words.slice(start, start + LEVEL_SIZE)
}

/** 某难度是否已缓存到本地（用于首页显示"已缓存/需下载"） */
export async function isLevelCached(level) {
  const meta = await getMeta(metaKeyOfLevel(level))
  return !!(meta && meta.count > 0)
}

/**
 * 清空词库缓存（设置页「清空离线词库」用）。
 * 只删词库文件缓存，不动学习记录——学习记录里的 wordId 是固定规则生成的，
 * 重新下载词库后仍然对得上。
 */
export async function clearWordCache() {
  levelCache.clear()
  await transact(STORE.WORDS, (stores) => {
    stores[STORE.WORDS].clear()
  })
  for (const level of [1, 2, 3]) {
    await setMeta(metaKeyOfLevel(level), null)
  }
}
