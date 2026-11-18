import { reactive } from 'vue'
import http from '../api/request'
import { getToken, setToken, clearToken } from './token'

/**
 * 极简用户状态。
 * 只有「当前登录信息」这一份共享数据，用 reactive 对象足够，
 * 不引入 Pinia/Vuex 是为了减少依赖（符合依赖最小化原则）。
 */
export const userState = reactive({
  username: '',
  nickname: '',
  isGuest: 1,
  logged: false
})

function applyLogin(data) {
  setToken(data.token)
  userState.username = data.username
  userState.nickname = data.nickname
  userState.isGuest = data.isGuest
  userState.logged = true
}

/** 用返回的用户信息刷新当前状态 */
function applyMe(me) {
  userState.username = me.username
  userState.nickname = me.nickname
  userState.isGuest = me.isGuest
  userState.logged = true
}

/**
 * 确保处于登录态：
 * 本地没有 token 时自动创建一个游客账号，有 token 时校验是否仍然有效。
 */
export async function ensureLogin() {
  if (!getToken()) {
    const data = await http.post('/auth/guest')
    applyLogin(data)
    return
  }
  try {
    const me = await http.get('/auth/me')
    applyMe(me)
  } catch (e) {
    // token 失效（过期/数据库被重置），退回游客身份
    clearToken()
    const data = await http.post('/auth/guest')
    applyLogin(data)
  }
}

export async function login(username, password) {
  const data = await http.post('/auth/login', { username, password })
  applyLogin(data)
}

export async function register(username, password, nickname) {
  const data = await http.post('/auth/register', { username, password, nickname })
  applyLogin(data)
}

/**
 * 退出登录：清掉当前 token 后立刻切回游客身份，
 * 这样用户点完退出不会看到一个需要填密码才能用的空壳应用。
 */
export async function logout() {
  try {
    await http.post('/auth/logout')
  } catch (e) {
    // 退出失败也继续清理本地状态
  }
  clearToken()
  const data = await http.post('/auth/guest')
  applyLogin(data)
}
