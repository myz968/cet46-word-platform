/**
 * IndexedDB 存储层。
 *
 * 【为什么不用 localStorage】
 * 移动端要把 5547 个单词 + 每次作答记录都放本地：
 *   - localStorage 容量只有约 5MB，还要求整串字符串同步读写，手机上一次写 2000 多词会卡住；
 *   - IndexedDB 容量按可用磁盘算（几百 MB 起步），异步读写不阻塞界面，还能建索引按范围查。
 * 所以单词库、作答记录、错题本、复习任务、闯关记录全部放 IndexedDB。
 *
 * 【对象仓设计】完全对齐桌面端 SQLite 的表结构，字段名也保持一致：
 *   t_word            -> words
 *   t_answer_record   -> answerRecords
 *   t_wrong_word      -> wrongWords     主键 [userId, wordId]  ← 对应 UNIQUE(user_id, word_id)
 *   t_review_task     -> reviewTasks    主键 [userId, wordId]  ← 对应 UNIQUE(user_id, word_id)
 *   t_stage_record    -> stageRecords
 *   t_user_stage      -> userStages     主键 [userId, freqLevel, stageNo]
 * 这样将来做同步功能时，两边结构能直接对上，不用重新设计。
 */
import { USER_ID } from '../core/constants'

const DB_NAME = 'cet46_h5'
const DB_VERSION = 1

/** 对象仓名集中定义，避免各处手写字符串写错 */
export const STORE = {
  META: 'meta', // 键值对：词库版本、各难度导入状态等
  WORDS: 'words', // 词库
  ANSWERS: 'answerRecords', // 作答记录
  WRONG: 'wrongWords', // 错题本
  REVIEW: 'reviewTasks', // 艾宾浩斯复习任务
  STAGES: 'stageRecords', // 闯关记录
  USER_STAGES: 'userStages' // 每关最好成绩 / 挑战次数
}

let dbPromise = null

/** 打开（首次会创建）数据库 */
export function openDB() {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('当前浏览器不支持本地存储（IndexedDB），请换用 Chrome / Safari / Edge'))
      return
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result

      // ---- 词库 ----
      if (!db.objectStoreNames.contains(STORE.WORDS)) {
        const s = db.createObjectStore(STORE.WORDS, { keyPath: 'id' })
        // 按 (难度, 序号) 取某一关的 20 个词
        s.createIndex('by_level_seq', ['freqLevel', 'seq'])
        // 取整个难度的词（生成干扰项要随机抽同难度的词）
        s.createIndex('by_level', 'freqLevel')
        // 单词文本唯一，和后端 t_word.word UNIQUE 对齐
        s.createIndex('by_word', 'word', { unique: true })
      }

      // ---- 键值对（词库版本、导入时间等） ----
      if (!db.objectStoreNames.contains(STORE.META)) {
        db.createObjectStore(STORE.META, { keyPath: 'key' })
      }

      // ---- 作答记录 ----
      if (!db.objectStoreNames.contains(STORE.ANSWERS)) {
        const s = db.createObjectStore(STORE.ANSWERS, { keyPath: 'id', autoIncrement: true })
        s.createIndex('by_wordId', 'wordId')
        s.createIndex('by_time', 'createTime')
      }

      // ---- 错题本：同一用户同一单词只留一条，错一次累加次数 ----
      if (!db.objectStoreNames.contains(STORE.WRONG)) {
        const s = db.createObjectStore(STORE.WRONG, { keyPath: ['userId', 'wordId'] })
        s.createIndex('by_user_mastered', ['userId', 'mastered'])
      }

      // ---- 复习任务：stage 1~5，dueTime 到期即可复习 ----
      if (!db.objectStoreNames.contains(STORE.REVIEW)) {
        const s = db.createObjectStore(STORE.REVIEW, { keyPath: ['userId', 'wordId'] })
        // 查"今天到期的"：userId + finished=0 + dueTime <= now
        s.createIndex('by_user_finished_due', ['userId', 'finished', 'dueTime'])
      }

      // ---- 闯关记录 ----
      if (!db.objectStoreNames.contains(STORE.STAGES)) {
        const s = db.createObjectStore(STORE.STAGES, { keyPath: 'id', autoIncrement: true })
        s.createIndex('by_user_time', ['userId', 'createTime'])
      }

      // ---- 关卡最好成绩 ----
      if (!db.objectStoreNames.contains(STORE.USER_STAGES)) {
        const s = db.createObjectStore(STORE.USER_STAGES, {
          keyPath: ['userId', 'freqLevel', 'stageNo']
        })
        s.createIndex('by_user_level', ['userId', 'freqLevel'])
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('本地数据库打开失败'))
    req.onblocked = () => reject(new Error('本地数据库被其他页面占用，请关闭本应用的其他标签页后重试'))
  })

  return dbPromise
}

/** 把 IndexedDB 的 request 包成 Promise */
function toPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** 读单个 */
export async function get(storeName, key) {
  const db = await openDB()
  return toPromise(db.transaction(storeName, 'readonly').objectStore(storeName).get(key))
}

/** 读全部 */
export async function getAll(storeName) {
  const db = await openDB()
  return toPromise(db.transaction(storeName, 'readonly').objectStore(storeName).getAll())
}

/** 按索引读全部 */
export async function getAllByIndex(storeName, indexName, query) {
  const db = await openDB()
  const store = db.transaction(storeName, 'readonly').objectStore(storeName)
  return toPromise(store.index(indexName).getAll(query))
}

/** 按索引读 key（只取主键/索引键，比读整条记录省内存） */
export async function getAllKeysByIndex(storeName, indexName, query) {
  const db = await openDB()
  const store = db.transaction(storeName, 'readonly').objectStore(storeName)
  return toPromise(store.index(indexName).getAllKeys(query))
}

/** 按索引计数 */
export async function countByIndex(storeName, indexName, query) {
  const db = await openDB()
  const store = db.transaction(storeName, 'readonly').objectStore(storeName)
  return toPromise(store.index(indexName).count(query))
}

/** 写单条 */
export async function put(storeName, value) {
  const db = await openDB()
  return toPromise(db.transaction(storeName, 'readwrite').objectStore(storeName).put(value))
}

/** 删单条 */
export async function remove(storeName, key) {
  const db = await openDB()
  return toPromise(db.transaction(storeName, 'readwrite').objectStore(storeName).delete(key))
}

/** 清空某个仓 */
export async function clear(storeName) {
  const db = await openDB()
  return toPromise(db.transaction(storeName, 'readwrite').objectStore(storeName).clear())
}

/**
 * 在一个事务里做「读 + 判断 + 写」。
 *
 * 注意：fn 里必须**同步**发出所有请求（用 request.onsuccess 串联后续操作），
 * 不能 await —— IndexedDB 的事务在事件循环让出后会自动提交，
 * await 之后发的请求会报 TransactionInactiveError。
 *
 * @param {string|string[]} storeNames 参与事务的仓
 * @param {(stores: Record<string, IDBObjectStore>) => void} fn
 */
export async function transact(storeNames, fn) {
  const db = await openDB()
  const names = Array.isArray(storeNames) ? storeNames : [storeNames]

  return new Promise((resolve, reject) => {
    let tx
    try {
      tx = db.transaction(names, 'readwrite')
    } catch (e) {
      reject(e)
      return
    }

    const stores = {}
    names.forEach((n) => {
      stores[n] = tx.objectStore(n)
    })

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error || new Error('本地数据写入被中止'))

    try {
      fn(stores)
    } catch (e) {
      try {
        tx.abort()
      } catch (_) {
        // 事务可能已结束，忽略
      }
      reject(e)
    }
  })
}

/**
 * 分批批量写入。
 * 一次写 2400 个词会让低端安卓机明显卡一下，拆成每批 400 条、
 * 每批之间让出主线程，页面就不会卡死（用户还能看到加载提示）。
 */
export async function bulkPut(storeName, values, chunkSize = 400) {
  for (let i = 0; i < values.length; i += chunkSize) {
    const chunk = values.slice(i, i + chunkSize)
    await transact(storeName, (stores) => {
      const s = stores[storeName]
      chunk.forEach((v) => s.put(v))
    })
    // 让出主线程，避免长任务卡住渲染
    await new Promise((r) => setTimeout(r, 0))
  }
}

/** 读 meta 里的一个值 */
export async function getMeta(key, fallback = null) {
  const row = await get(STORE.META, key)
  return row ? row.value : fallback
}

/** 写 meta */
export async function setMeta(key, value) {
  return put(STORE.META, { key, value })
}

/** 当前用户 id（单机版固定 1，留成函数方便以后做多账号） */
export function currentUserId() {
  return USER_ID
}
