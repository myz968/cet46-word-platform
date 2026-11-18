import axios from 'axios'
import { ElMessage } from 'element-plus'
import { getToken, clearToken } from '../store/token'

/**
 * 统一的 axios 实例。
 *
 * 约定：后端固定返回 { code, message, data }，这里在响应拦截器里「拆包」，
 * 业务代码拿到的直接就是 data，不用每次都写 res.data.data。
 * code === 0 视为成功，其余按失败抛错并弹出提示。
 */
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 20000
})

// 请求拦截：自动带上登录令牌
http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers['X-Token'] = token
  }
  return config
})

// 响应拦截：统一处理业务码与网络错误
http.interceptors.response.use(
  (response) => {
    const body = response.data
    if (body && body.code === 0) {
      return body.data
    }
    const message = (body && body.message) || '请求失败'
    if (body && body.code === 401) {
      clearToken()
      ElMessage.error('登录状态已失效，请到「我的」重新登录')
    } else {
      ElMessage.error(message)
    }
    return Promise.reject(new Error(message))
  },
  (error) => {
    // 连不上后端（例如后端还没启动）时给出明确提示，方便排查
    const message = '无法连接本地服务，请确认后端已启动（8080 端口）'
    ElMessage.error(message)
    return Promise.reject(error)
  }
)

export default http
