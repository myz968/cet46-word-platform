import http from './request'

/**
 * 所有接口集中在这里声明。
 * 好处：页面组件里只调用语义化函数，接口路径改动时只需改这一个文件。
 */

// ===== 认证 =====
export const apiGuest = () => http.post('/auth/guest')
export const apiLogin = (data) => http.post('/auth/login', data)
export const apiRegister = (data) => http.post('/auth/register', data)
export const apiLogout = () => http.post('/auth/logout')
export const apiMe = () => http.get('/auth/me')

// ===== 闯关 =====
export const apiLevels = () => http.get('/stage/levels')
export const apiLevelDetail = (freqLevel) => http.get(`/stage/${freqLevel}/detail`)
export const apiStageQuestions = (freqLevel, stageNo, mode) =>
  http.get(`/stage/${freqLevel}/${stageNo}/questions`, { params: { mode } })
export const apiStageSubmit = (data) => http.post('/stage/submit', data)

// ===== 错题本 =====
export const apiWrongPage = (pageNo, pageSize) =>
  http.get('/wrong-book', { params: { pageNo, pageSize } })
export const apiWrongQuestions = (mode, limit) =>
  http.get('/wrong-book/questions', { params: { mode, limit } })
export const apiWrongSubmit = (data) => http.post('/wrong-book/submit', data)
export const apiWrongRemove = (id) => http.delete(`/wrong-book/${id}`)

// ===== 艾宾浩斯复习 =====
export const apiReviewToday = () => http.get('/review/today')
export const apiReviewQuestions = (mode, limit) =>
  http.get('/review/questions', { params: { mode, limit } })
export const apiReviewSubmit = (data) => http.post('/review/submit', data)

// ===== 我的 =====
export const apiOverview = () => http.get('/profile/overview')

// ===== 词库维护（设置页：看词库规模 / 重置词库） =====
export const apiWordStats = () => http.get('/admin/word/stats')
export const apiWordReset = () => http.post('/admin/word/reset')

// ===== 预留扩展（本期未实现，仅用于展示能力存在） =====
export const apiBattleStatus = () => http.get('/ext/battle/status')
