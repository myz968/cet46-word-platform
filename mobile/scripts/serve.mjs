// 本地静态服务器（零依赖）
// 用法：npm run serve
//       或指定端口：PORT=8080 npm run serve
//
// 作用：把 `npm run build` 生成的 dist 目录用本地 HTTP 服务跑起来，
// 并且把「局域网地址」打印出来 —— 手机连同一个 WiFi 就能直接打开，
// 这是验证"手机浏览器直接使用"最方便的方式，不用部署到服务器。
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..', 'dist')
const PORT = Number(process.env.PORT || 5180)
const HOST = process.env.HOST || '0.0.0.0'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8'
}

if (!fs.existsSync(ROOT)) {
  console.error('找不到 dist 目录，请先执行：npm run build')
  process.exit(1)
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0])
  let filePath = path.join(ROOT, urlPath)

  // 目录或根路径都回 index.html（hash 路由不需要服务端 rewrite，这里只是兜底）
  if (urlPath === '/' || !path.extname(filePath)) {
    filePath = path.join(ROOT, 'index.html')
  }

  // 防目录穿越：解析后的真实路径必须还在 dist 内
  if (!path.resolve(filePath).startsWith(ROOT)) {
    res.writeHead(403).end('Forbidden')
    return
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('找不到文件')
      return
    }
    const ext = path.extname(filePath).toLowerCase()
    const isHtml = ext === '.html'
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      // HTML 不缓存（方便改了重新构建后刷新就能看到），静态资源缓存 1 小时
      'Cache-Control': isHtml ? 'no-cache' : 'public, max-age=3600'
    })
    res.end(data)
  })
})

/** 找出本机在局域网里的 IPv4 地址，手机要用它访问 */
function lanAddresses() {
  const result = []
  const nets = os.networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) result.push(net.address)
    }
  }
  return result
}

server.listen(PORT, HOST, () => {
  console.log('')
  console.log('  四六级单词闯关 · 移动端 H5 已启动')
  console.log('')
  console.log(`  电脑上打开： http://localhost:${PORT}`)
  for (const ip of lanAddresses()) {
    console.log(`  手机上打开： http://${ip}:${PORT}   （手机需和电脑连同一个 WiFi）`)
  }
  console.log('')
  console.log('  按 Ctrl+C 停止')
  console.log('')
})
