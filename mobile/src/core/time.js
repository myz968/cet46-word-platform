/**
 * 时间工具。
 *
 * 为什么统一用 'yyyy-MM-dd HH:mm:ss' 字符串而不是时间戳：
 * 桌面端 SQLite 里存的就是这种文本（可直接字符串比较大小），
 * 移动端沿用它，将来做「手机 ↔ 电脑」同步时不用做时间格式转换。
 */

/** 补零 */
function pad(n) {
  return String(n).padStart(2, '0')
}

/** 把 Date 格式化成 'yyyy-MM-dd HH:mm:ss'（本地时区） */
export function format(date) {
  const d = date instanceof Date ? date : new Date(date)
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  )
}

/** 当前时间字符串 */
export function now() {
  return format(new Date())
}

/**
 * 当前时间往后 n 天的字符串。
 * n = 0 时就是「现在」，对应艾宾浩斯第 1 阶段「当天即可复习」。
 */
export function plusDays(n) {
  const d = new Date()
  d.setDate(d.getDate() + (Number(n) || 0))
  return format(d)
}

/** 今天 00:00 的时间字符串，用于「今日已作答」这类按天统计 */
export function todayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return format(d)
}

/** 把秒数变成 mm:ss */
export function mmss(sec) {
  const s = Math.max(0, Math.floor(sec || 0))
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`
}

/**
 * 把 'yyyy-MM-dd HH:mm:ss' 转成「刚刚 / 3 分钟前 / 2 天前」这种好读的说法。
 * 小白用户看日期容易没概念，这里统一做成人话。
 */
export function fromNow(timeStr) {
  if (!timeStr) return ''
  const t = new Date(timeStr.replace(/-/g, '/')).getTime()
  const diff = Date.now() - t
  if (diff < 60 * 1000) return '刚刚'
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 30 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / 86400000)} 天前`
  return timeStr.slice(0, 10)
}

/** 只取日期部分 'yyyy-MM-dd' */
export function dateOnly(timeStr) {
  return String(timeStr || '').slice(0, 10)
}
