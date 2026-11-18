// 应用图标生成脚本（零依赖，纯手写 PNG 编码）
// 用法：node scripts/build-icons.mjs
//
// 为什么自己画：项目要求"依赖最小化"，为了几个图标去装 sharp / canvas 不值得。
// 这里直接按像素合成 RGBA，再用 zlib 压缩成标准 PNG 文件。
//
// 图形：蓝色圆角方块 + 白色翻开的书 + 橙色书签，配色和页面的主色一致（#409eff）。
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(HERE, '..', 'public', 'icons')

// ===================== PNG 编码 =====================

/** CRC32 查表（PNG 每个数据块都要带） */
const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

/** RGBA 像素数组 → PNG Buffer */
function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // 位深 8
  ihdr[9] = 6 // 颜色类型 6 = RGBA
  ihdr[10] = 0 // 压缩方式
  ihdr[11] = 0 // 滤波方式
  ihdr[12] = 0 // 非隔行

  // 每行前面加一个 0 表示不使用滤波
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

// ===================== 绘图原语 =====================
// 所有坐标都用 0~1 的相对值，这样同一份代码可以生成任意尺寸的图。

/** 在圆角矩形内返回 true */
function inRoundRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false
  const cx = Math.min(Math.max(x, x0 + r), x1 - r)
  const cy = Math.min(Math.max(y, y0 + r), y1 - r)
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= r * r
}

/** 绘制一张图标，返回 RGBA Buffer */
function drawIcon(size, { maskable = false } = {}) {
  const px = Buffer.alloc(size * size * 4)
  // 3×3 超采样，边缘更顺滑（不然圆角会有明显锯齿）
  const SS = 3

  // maskable 图标要留出安全边距：内容整体缩小到 78%，避免被系统裁掉
  const scale = maskable ? 0.78 : 1
  const off = (1 - scale) / 2
  const map = (v) => (v - 0.5) / scale + 0.5

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          // 归一化坐标
          let u = (x + (sx + 0.5) / SS) / size
          let v = (y + (sy + 0.5) / SS) / size

          // 把内容映射到中间区域（maskable 用）
          u = map(u) * scale + off
          v = map(v) * scale + off

          const c = sample(u, v, maskable)
          r += c[0] * c[3]
          g += c[1] * c[3]
          b += c[2] * c[3]
          a += c[3]
        }
      }

      const n = SS * SS
      const alpha = a / n
      const i = (y * size + x) * 4
      if (alpha > 0) {
        px[i] = Math.round(r / a)
        px[i + 1] = Math.round(g / a)
        px[i + 2] = Math.round(b / a)
      }
      px[i + 3] = Math.round(alpha * 255)
    }
  }

  return px
}

/** 单个采样点的颜色（从底层往上层叠） */
function sample(u, v, maskable) {
  // ---- 底层：蓝色圆角方块 ----
  // maskable 图标必须是满幅背景（否则系统裁成圆形时四角会露白）
  const inBackground = maskable ? u >= -0.2 && u <= 1.2 && v >= -0.2 && v <= 1.2 : inRoundRect(u, v, 0.02, 0.02, 0.98, 0.98, 0.22)
  if (!inBackground) return [0, 0, 0, 0]

  // 竖向渐变：上浅下深，和页面按钮的层级感一致
  const t = Math.min(1, Math.max(0, (v - 0.02) / 0.96))
  let color = [
    Math.round(74 + (47 - 74) * t), // 4aa3ff -> 2f7fdb
    Math.round(163 + (127 - 163) * t),
    Math.round(255 + (219 - 255) * t),
    1
  ]

  // ---- 书脊：中间一条稍深的缝 ----
  if (u > 0.495 && u < 0.505 && v > 0.3 && v < 0.72) {
    color = [47, 127, 219, 1]
  }

  // ---- 白色书页（左右两片，上沿略高，像翻开的书） ----
  const leftPage = inRoundRect(u, v, 0.21, 0.335, 0.487, 0.715, 0.035)
  const rightPage = inRoundRect(u, v, 0.513, 0.335, 0.79, 0.715, 0.035)
  if (leftPage || rightPage) {
    color = [255, 255, 255, 1]

    // 书页上的三行"字"：用浅蓝灰细条表示，远看像排版好的单词卡
    const lines = [
      [0.375, 0.415],
      [0.455, 0.495],
      [0.535, 0.575]
    ]
    for (let i = 0; i < lines.length; i++) {
      const [y0, y1] = lines[i]
      const isLeft = leftPage
      // 左边书页的行短一点，右边长一点，视觉上更像真实文字
      const x0 = isLeft ? 0.255 : 0.548
      const x1 = isLeft ? 0.445 : 0.755 - (i === 2 ? 0.09 : 0)
      if (inRoundRect(u, v, x0, y0, x1, y1, 0.018)) {
        color = [150, 195, 245, 1]
      }
    }
  }

  // ---- 橙色书签：从右页顶部垂下来，作为点缀色 ----
  if (u > 0.695 && u < 0.745 && v > 0.28 && v < 0.47) {
    // 底部剪一个 V 形缺口
    const notch = 0.47 - Math.abs(u - 0.72) * 0.6
    if (v < notch) color = [230, 162, 60, 1]
  }

  return color
}

// ===================== 输出 =====================

function writePng(name, size, opts) {
  const px = drawIcon(size, opts)
  const file = path.join(OUT_DIR, name)
  fs.writeFileSync(file, encodePng(size, size, px))
  const kb = (fs.statSync(file).size / 1024).toFixed(1)
  console.log(`${name}  ${size}×${size}  ${kb} KB`)
}

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4aa3ff"/>
      <stop offset="1" stop-color="#2f7fdb"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#g)"/>
  <rect x="13" y="21" width="18" height="24" rx="2.5" fill="#fff"/>
  <rect x="33" y="21" width="18" height="24" rx="2.5" fill="#fff"/>
  <rect x="31" y="21" width="2" height="24" fill="#2f7fdb"/>
  <rect x="16" y="26" width="11" height="2.6" rx="1.3" fill="#96c3f5"/>
  <rect x="16" y="31" width="12" height="2.6" rx="1.3" fill="#96c3f5"/>
  <rect x="36" y="26" width="12" height="2.6" rx="1.3" fill="#96c3f5"/>
  <rect x="36" y="31" width="9" height="2.6" rx="1.3" fill="#96c3f5"/>
  <rect x="44" y="18" width="3.2" height="12" fill="#e6a23c"/>
</svg>
`

fs.mkdirSync(OUT_DIR, { recursive: true })
writePng('icon-192.png', 192)
writePng('icon-512.png', 512)
writePng('icon-maskable-512.png', 512, { maskable: true })
writePng('apple-touch-icon.png', 180, { maskable: true })
fs.writeFileSync(path.join(OUT_DIR, 'favicon.svg'), FAVICON_SVG, 'utf8')
console.log('favicon.svg  矢量图标')
