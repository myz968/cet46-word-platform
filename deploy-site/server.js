'use strict'
/**
 * CET46 H5 静态托管服务（零第三方依赖，只用 Node 内置模块）
 *
 * 目的：平台默认静态托管无法自定义响应头，这里显式设置
 *   1) 正确的 MIME：.webmanifest -> application/manifest+json、.js -> application/javascript ...
 *   2) 分级缓存：入口/SW/manifest 不缓存；带内容 hash 的 assets 长期强缓存；词库短缓存
 *   3) Service-Worker-Allowed: /  让 sw.js 可控制整个站点作用域
 *
 * 约束：监听 PORT 环境变量、绑定 0.0.0.0（发布平台要求）。
 */
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const ROOT = __dirname
const PORT = Number(process.env.PORT) || 3000

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
}

/** 按请求相对路径返回 Cache-Control */
function cacheControl(rel) {
  const name = path.basename(rel)
  // 入口、Service Worker、manifest：必须随时拿最新，禁止缓存
  if (name === 'index.html' || name === 'sw.js' || name === 'manifest.webmanifest' || rel === '' || rel === '/') {
    return 'no-cache, no-store, must-revalidate'
  }
  // Vite 产物带内容 hash，内容变了文件名就变 -> 永久强缓存
  if (rel.startsWith('assets/')) return 'public, max-age=31536000, immutable'
  // 词库 JSON 可能随版本更新，短缓存 + 每次校验（SW 另有缓存层）
  if (rel.startsWith('data/')) return 'public, max-age=3600, must-revalidate'
  // 图标
  if (rel.startsWith('icons/')) return 'public, max-age=604800'
  return 'no-cache'
}

const server = http.createServer((req, res) => {
  // manifest 使用 crossorigin="use-credentials" 以携带鉴权 cookie，
  // 需回显具体 Origin（不能用 *）+ Allow-Credentials，否则浏览器拒绝该响应。
  const origin = req.headers.origin
  const cors = {}
  if (origin) {
    cors['Access-Control-Allow-Origin'] = origin
    cors['Access-Control-Allow-Credentials'] = 'true'
    cors['Vary'] = 'Origin'
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      ...cors,
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    })
    res.end()
    return
  }

  let pathname
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  } catch (_) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Bad Request')
    return
  }

  let rel = pathname.replace(/^\/+/, '')
  if (rel === '') rel = 'index.html'

  // 防目录穿越：解析后必须仍在 ROOT 内
  const abs = path.resolve(ROOT, rel)
  if (abs !== ROOT && !abs.startsWith(ROOT + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Forbidden')
    return
  }

  let stat
  try {
    stat = fs.statSync(abs)
  } catch (_) {
    stat = null
  }

  // SPA 保险：无扩展名且不是文件 -> 回退到 index.html（本项目用 hash 路由，正常不会走到）
  if ((!stat || stat.isDirectory()) && !path.extname(rel)) {
    rel = 'index.html'
    try { stat = fs.statSync(path.resolve(ROOT, rel)) } catch (_) { stat = null }
  }

  if (!stat || !stat.isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
    res.end('404 Not Found')
    return
  }

  const ext = path.extname(rel).toLowerCase()
  const headers = {
    ...cors,
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': cacheControl(rel),
    'X-Content-Type-Options': 'nosniff',
    'Last-Modified': stat.mtime.toUTCString()
  }
  if (rel === 'index.html' || rel === 'sw.js' || rel === 'manifest.webmanifest') {
    headers['Pragma'] = 'no-cache'
    headers['Expires'] = '0'
  }
  // 允许 sw.js 控制整个 origin（含子路径部署场景）
  if (rel === 'sw.js') headers['Service-Worker-Allowed'] = '/'

  // 条件请求 -> 304
  const inm = req.headers['if-none-match']
  const ims = req.headers['if-modified-since']
  const etag = '"' + stat.size.toString(16) + '-' + Math.floor(stat.mtimeMs).toString(16) + '"'
  headers['ETag'] = etag
  if (inm === etag || (ims && new Date(ims).getTime() >= Math.floor(stat.mtimeMs / 1000) * 1000)) {
    res.writeHead(304, headers)
    res.end()
    return
  }

  res.writeHead(200, headers)
  if (req.method === 'HEAD') { res.end(); return }
  const stream = fs.createReadStream(abs)
  stream.on('error', () => { if (!res.headersSent) res.writeHead(500); res.end() })
  stream.pipe(res)
})

server.listen(PORT, '0.0.0.0', () => {
  console.log('CET46 H5 static host listening on 0.0.0.0:' + PORT)
})
