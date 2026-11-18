/* eslint-env serviceworker */
/**
 * Service Worker：让网页在断网时也能打开（PWA 的核心）。
 *
 * 缓存策略分三类，都是为了"手机上体验像 App"：
 *   1. 导航请求（打开页面）   → 先走网络拿最新版；断网时回退到缓存的 index.html
 *   2. 词库 JSON（data/*.json）→ 缓存优先。词库内容不变，没必要每次重新下 800KB
 *   3. 其它静态资源（js/css/图标）→ 先用缓存渲染、同时后台悄悄更新（stale-while-revalidate）
 *
 * 注意：浏览器要求 Service Worker 必须通过 https 或 localhost 访问才生效；
 * 用「局域网 IP + http」打开时不会注册成功，页面仍能正常使用，只是没有离线缓存能力。
 * 详见 README 里 PWA 那一节。
 */

// 改了静态资源就要改版本号，否则用户手机上会一直用旧缓存
const VERSION = '1.0.1'
const CACHE_NAME = `cet46-h5-${VERSION}`

/** 安装时就要预缓存的核心文件（保证首次打开后断网也能进得去） */
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './data/index.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon.svg'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)

      // 逐个 add，某个文件不存在不会导致整个安装失败
      await Promise.all(
        PRECACHE.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => null)
        )
      )

      // 关键一步：缓存 index.html 里引用的 JS/CSS。
      // 打包后的文件名带哈希（index-a1b2c3.js），没法写死在 PRECACHE 里，
      // 所以这里现场解析 index.html 把资源名抓出来。
      // 不做这一步的话，用户第一次打开就断网，路由懒加载的分包会加载失败（白屏）。
      try {
        const res = await fetch(new Request('./index.html', { cache: 'reload' }))
        const html = await res.clone().text()
        await cache.put('./index.html', res)

        const urls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
          .map((m) => m[1])
          .filter((u) => /\.(?:js|css|png|svg|webmanifest)$/.test(u))
          .map((u) => new URL(u, self.location.href).href)

        await Promise.all(urls.map((u) => cache.add(u).catch(() => null)))

        // 再补一份首页用到的懒加载分包：直接抓 Vite 产物里的入口依赖不现实，
        // 这里把跳转后会用到的页面 chunk 交给运行时缓存兜底（见 fetch 的第 3 类策略）。
      } catch (e) {
        // 拿不到就算了，不影响安装，联网后再补
      }

      await self.skipWaiting()
    })()
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      await self.clients.claim()
    })()
  )
})

/**
 * 接收页面发来的"请缓存这些文件"指令。
 *
 * 页面首次打开时 Service Worker 还没接管（要刷新一次才接管），
 * 所以页面会主动把已经加载过的 JS/CSS 地址发过来，这里帮忙写进缓存。
 * 不做这一步的话，用户第一次打开就断网，点进别的页面会白屏。
 */
self.addEventListener('message', (event) => {
  const data = event.data
  if (!data || data.type !== 'CACHE_URLS' || !Array.isArray(data.urls)) return

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      await Promise.all(
        data.urls
          .filter((u) => typeof u === 'string' && u.startsWith(self.location.origin))
          .map((u) => cache.add(u).catch(() => null))
      )
    })()
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  // 只管自己域名下的资源，第三方请求一律放过
  if (url.origin !== self.location.origin) return

  // ---- 1. 打开页面：网络优先，断网回退缓存 ----
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req)
          const cache = await caches.open(CACHE_NAME)
          cache.put('./index.html', fresh.clone()).catch(() => {})
          return fresh
        } catch (e) {
          const cache = await caches.open(CACHE_NAME)
          return (
            (await cache.match('./index.html')) ||
            (await cache.match('./')) ||
            new Response('离线状态下暂时打不开，请联网后重试', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            })
          )
        }
      })()
    )
    return
  }

  // ---- 2. 词库：缓存优先（内容固定，重下没意义） ----
  if (url.pathname.includes('/data/') && url.pathname.endsWith('.json')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME)
        const hit = await cache.match(req)
        if (hit) return hit
        const fresh = await fetch(req)
        if (fresh.ok) cache.put(req, fresh.clone()).catch(() => {})
        return fresh
      })()
    )
    return
  }

  // ---- 3. 其它静态资源：先给缓存，再后台更新 ----
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      const hit = await cache.match(req)

      const network = fetch(req)
        .then((fresh) => {
          if (fresh && fresh.ok) cache.put(req, fresh.clone()).catch(() => {})
          return fresh
        })
        .catch(() => null)

      return hit || (await network) || Response.error()
    })()
  )
})
