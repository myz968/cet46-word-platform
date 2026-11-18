/**
 * 令牌存储：单独一个小模块，避免 request.js 与 store/user.js 相互 import 造成循环依赖。
 * 用 localStorage 持久化，关掉应用再打开仍是同一个账号（游客也一样）。
 */
const TOKEN_KEY = 'cet46_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}
